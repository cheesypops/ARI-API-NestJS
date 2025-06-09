import { Injectable } from '@nestjs/common';
import { ParserService } from './parser.service';
import { CryptoUtil } from '../utils/crypto.util';
import { GeoJSONPolygon } from '../interfaces/client.interface';

@Injectable()
export class JsonService {
  constructor(
    private parserService: ParserService,
    private cryptoUtil: CryptoUtil,
  ) {}

  generateJson(content: string, delimiter: string, key: string): string {
    const clients = this.parserService.parseTextFile(content, delimiter);
    const encryptedClients = clients.map(client => ({
      ...client,
      tarjeta: this.cryptoUtil.encrypt(client.tarjeta, key),
      // Ensure polygon follows GeoJSON standard
      poligono: client.poligono ? this.validateAndEnhanceGeoJSONPolygon(client.poligono) : undefined,
    }));
    return JSON.stringify({ clientes: encryptedClients }, null, 2);
  }

  /**
   * Validates and enhances a GeoJSON polygon to ensure full OGC compliance
   */
  private validateAndEnhanceGeoJSONPolygon(polygon: GeoJSONPolygon): GeoJSONPolygon {
    // Validate basic structure
    if (!polygon || polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
      throw new Error('Invalid GeoJSON Polygon structure');
    }

    // Validate coordinates structure
    if (polygon.coordinates.length === 0) {
      throw new Error('GeoJSON Polygon must have at least one linear ring');
    }

    // Validate each linear ring
    const validatedCoordinates = polygon.coordinates.map((ring, ringIndex) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error(`Linear ring ${ringIndex} must have at least 4 coordinate pairs`);
      }

      // Ensure ring is closed (first and last points are the same)
      const firstPoint = ring[0];
      const lastPoint = ring[ring.length - 1];
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        // Close the ring if it's not already closed
        return [...ring, [firstPoint[0], firstPoint[1]]];
      }

      return ring;
    });

    // Calculate bounding box for enhanced GeoJSON compliance
    const bbox = this.calculateBoundingBox(validatedCoordinates[0]);

    return {
      type: 'Polygon',
      coordinates: validatedCoordinates,
      bbox: bbox,
    };
  }

  /**
   * Calculates bounding box [minLon, minLat, maxLon, maxLat] for a linear ring
   */
  private calculateBoundingBox(ring: number[][]): number[] {
    let minLon = Infinity, minLat = Infinity;
    let maxLon = -Infinity, maxLat = -Infinity;

    ring.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    return [minLon, minLat, maxLon, maxLat];
  }
}