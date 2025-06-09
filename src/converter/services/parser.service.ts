import { Injectable } from '@nestjs/common';
import { ParsedClient, GeoJSONPolygon } from '../interfaces/client.interface';

@Injectable()
export class ParserService {
  parseTextFile(content: string, delimiter: string): ParsedClient[] {
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('//')); // Ignore empty lines and comments
    return lines.map(line => {
      // Split by delimiter, but handle the case where there might be an empty field before the polygon
      const parts = line.split(delimiter);
      
      // Expected format: documento;nombres;apellidos;tarjeta;tipo;telefono; ((coordinates))
      // The empty field after telefono needs to be handled
      if (parts.length < 6) {
        throw new Error(`Invalid line format. Expected at least 6 fields, got ${parts.length}: ${line}`);
      }

      const [documento, nombres, apellidos, tarjeta, tipo, telefono] = parts;
      
      // The polygon is typically in the last part, but might be after an empty field
      const poligonoText = parts.length > 7 ? parts[7] : parts[6];
      
      return {
        documento: documento?.trim(),
        nombres: nombres?.trim(),
        apellidos: apellidos?.trim(),
        tarjeta: tarjeta?.trim(),
        tipo: tipo?.trim(),
        telefono: telefono?.trim(),
        poligono: poligonoText ? this.parsePoligono(poligonoText.trim()) : undefined,
      };
    });  }
  private parsePoligono(poligono: string): GeoJSONPolygon {
    // Handle the specific format: ((-90.7695083618164 17.817752838134766, -90.743 17.82, -90.75 17.81, -90.7695083618164 17.817752838134766))
    try {
      // First, try to parse as JSON if it's already in GeoJSON format
      if (poligono.startsWith('{')) {
        const parsed = JSON.parse(poligono) as { type: 'Polygon'; coordinates: number[][][] };
        if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
          return parsed;
        }
        throw new Error('Invalid GeoJSON polygon format');
      }
      
      // Remove outer parentheses and parse the coordinate pairs
      const coordString = poligono.replace(/^\s*\(\(/, '').replace(/\)\)\s*$/, '');
      
      if (!coordString) {
        throw new Error('Empty polygon coordinates');
      }
      
      // Split by comma and parse each coordinate pair
      const coords = coordString.split(',').map(pair => {
        const trimmed = pair.trim();
        const [lonStr, latStr] = trimmed.split(/\s+/);
        const lon = parseFloat(lonStr);
        const lat = parseFloat(latStr);
        
        if (isNaN(lon) || isNaN(lat)) {
          throw new Error(`Invalid coordinate pair: ${trimmed}`);
        }
        
        return [lon, lat];
      });
      
      // Ensure the polygon is closed (first and last points are the same)
      if (coords.length > 0) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([first[0], first[1]]);
        }
      }
      
      return {
        type: 'Polygon',
        coordinates: [coords],
      };
    } catch (error) {
      throw new Error(`Failed to parse polygon: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}