import { Injectable } from '@nestjs/common';
import { ParserService } from './parser.service';
import { CryptoUtil } from '../utils/crypto.util';
import { create } from 'xmlbuilder2';
import { ClientData, GeoJSONPolygon } from '../interfaces/client.interface';

@Injectable()
export class XmlService {
  constructor(
    private parserService: ParserService,
    private cryptoUtil: CryptoUtil,
  ) {}

  generateXml(content: string, delimiter: string, key: string): string {
    try {
      // Validaciones de entrada
      if (!content || !content.trim()) {
        throw new Error('El contenido no puede estar vacío');
      }
      if (!delimiter) {
        throw new Error('El delimitador no puede estar vacío');
      }
      if (!key || key.length < 8) {
        throw new Error('La clave debe tener al menos 8 caracteres');
      }

      // Parsear archivo de texto
      const clients = this.parserService.parseTextFile(content, delimiter);
      
      if (!clients || clients.length === 0) {
        throw new Error('No se encontraron clientes válidos en el archivo');
      }      // Crear documento XML
      const doc = create({ version: '1.0', encoding: 'UTF-8' });
      const root = doc.ele('clientes');

      // Procesar cada cliente
      clients.forEach((client: ClientData, index: number) => {
        try {
          this.validateClient(client, index);
          
          const cliente = root.ele('cliente');
          cliente.ele('documento').txt(this.sanitizeText(String(client.documento || '')));
          cliente.ele('nombres').txt(this.sanitizeText(String(client.nombres || '')));
          cliente.ele('apellidos').txt(this.sanitizeText(String(client.apellidos || '')));
          
          // Cifrar tarjeta
          const cardValue = String(client.tarjeta || '');
          const encryptedCard = this.cryptoUtil.encrypt(cardValue, key);
          cliente.ele('tarjeta').txt(encryptedCard);          cliente.ele('tipo').txt(this.sanitizeText(String(client.tipo || '')));
          cliente.ele('telefono').txt(this.sanitizeText(String(client.telefono || '')));
          
          // Polígono GeoJSON (opcional)
          if (client.poligono) {
            this.addGeoJSONPolygonToXML(cliente, client.poligono);
          }        } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
          throw new Error('Error procesando cliente ' + (index + 1) + '.');
        }
      });

      return root.end({ prettyPrint: true });    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      throw new Error('Error generando XML');
    }
  }
  private validateClient(client: ClientData, index: number): void {
    if (!client) {
      throw new Error(`Cliente ${index + 1} es nulo o indefinido`);
    }
    
    // Validar campos requeridos
    if (!client.documento || String(client.documento).trim() === '') {
      throw new Error(`Campo requerido 'documento' está vacío en cliente ${index + 1}`);
    }
    if (!client.nombres || String(client.nombres).trim() === '') {
      throw new Error(`Campo requerido 'nombres' está vacío en cliente ${index + 1}`);
    }
    if (!client.apellidos || String(client.apellidos).trim() === '') {
      throw new Error(`Campo requerido 'apellidos' está vacío en cliente ${index + 1}`);
    }
    if (!client.tarjeta || String(client.tarjeta).trim() === '') {
      throw new Error(`Campo requerido 'tarjeta' está vacío en cliente ${index + 1}`);
    }
    if (!client.tipo || String(client.tipo).trim() === '') {
      throw new Error(`Campo requerido 'tipo' está vacío en cliente ${index + 1}`);
    }
    if (!client.telefono || String(client.telefono).trim() === '') {
      throw new Error(`Campo requerido 'telefono' está vacío en cliente ${index + 1}`);
    }
  }
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return String(text)
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }  /**
   * Adds a polygon to XML in the new format: POLYGON ((*coordinates*))
   */
  private addGeoJSONPolygonToXML(clientElement: any, polygon: GeoJSONPolygon): void {
    try {
      if (!polygon || polygon.type !== 'Polygon' || !polygon.coordinates || !Array.isArray(polygon.coordinates)) {
        return;
      }

      // Obtener el primer anillo de coordenadas (anillo exterior)
      const ring = polygon.coordinates[0];
      if (!Array.isArray(ring) || ring.length === 0) {
        return;
      }

      // Convertir cada par de coordenadas al formato "longitud latitud"
      const coordinateStrings = ring.map((coord: number[]) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          return '';
        }
        const lon = coord[0];
        const lat = coord[1];
        
        if (typeof lon !== 'number' || typeof lat !== 'number') {
          return '';
        }
        
        return `${lon} ${lat}`;
      }).filter(str => str !== '');

      if (coordinateStrings.length === 0) {
        return;
      }

      // Crear el formato POLYGON ((*coordenadas*))
      const polygonText = `POLYGON ((${coordinateStrings.join(', ')}))`;
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      clientElement.ele('poligono').txt(polygonText);
    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      // Si hay error, no agregar el polígono
    }
  }
}
