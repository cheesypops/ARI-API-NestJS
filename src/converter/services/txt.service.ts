import { Injectable } from '@nestjs/common';
import { CryptoUtil } from '../utils/crypto.util';
import { parseXmlToJson } from '../../utils/xml.util';
import { ClientData } from '../interfaces/client.interface';

interface JsonData {
  clientes: ClientData[];
}

interface XmlClientNode {
  documento?: string | XmlTextNode;
  nombres?: string | XmlTextNode;
  apellidos?: string | XmlTextNode;
  tarjeta?: string | XmlTextNode;
  tipo?: string | XmlTextNode;  telefono?: string | XmlTextNode;
  poligono?: string | XmlTextNode;
}

interface XmlTextNode {
  _?: string;
  '#text'?: string;
  [key: string]: unknown;
}

interface ParsedXmlData {
  clientes?: {
    cliente?: XmlClientNode | XmlClientNode[];
  };
  [key: string]: unknown;
}

@Injectable()
export class TxtService {
  constructor(private cryptoUtil: CryptoUtil) {}

  jsonToTxt(jsonContent: string, key: string, delimiter: string): string {
    try {
      const parsed = JSON.parse(jsonContent) as JsonData;
      
      if (!parsed.clientes || !Array.isArray(parsed.clientes)) {
        throw new Error('El JSON debe contener un array de clientes');
      }

      return parsed.clientes.map((client: ClientData) => {
        // Validar propiedades requeridas
        if (!client.documento || !client.nombres || !client.apellidos || !client.tarjeta) {
          throw new Error('Cliente debe tener documento, nombres, apellidos y tarjeta');
        }        // Descifrar tarjeta
        const decryptedTarjeta = this.cryptoUtil.decrypt(client.tarjeta, key);
        
        // Convertir polígono a formato de coordenadas específico
        const poligonoStr = client.poligono ? this.formatPolygonCoordinates(client.poligono) : '';
        
        return [
          client.documento,
          client.nombres,
          client.apellidos,
          decryptedTarjeta,
          client.tipo || '',
          client.telefono || '',
          poligonoStr,
        ].join(delimiter);
      }).join('\n');
    } catch (error) {
      throw new Error(`Error al convertir JSON a TXT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async xmlToTxt(xmlContent: string, key: string, delimiter: string): Promise<string> {
    try {
      // Parsear XML a JSON usando la utilidad
      const parsedXml = (await parseXmlToJson(xmlContent)) as ParsedXmlData;
      
      if (!parsedXml.clientes) {
        throw new Error('El XML debe contener un elemento clientes');
      }

      // Normalizar estructura - puede ser un array o un solo elemento
      let clientesArray: XmlClientNode[];
      if (parsedXml.clientes.cliente) {
        clientesArray = Array.isArray(parsedXml.clientes.cliente) 
          ? parsedXml.clientes.cliente 
          : [parsedXml.clientes.cliente];
      } else {
        throw new Error('No se encontraron elementos cliente en el XML');
      }

      return clientesArray.map((client: XmlClientNode) => {
        const documento = this.getXmlValue(client.documento) || '';
        const nombres = this.getXmlValue(client.nombres) || '';
        const apellidos = this.getXmlValue(client.apellidos) || '';
        const tarjetaEncrypted = this.getXmlValue(client.tarjeta) || '';
        const tipo = this.getXmlValue(client.tipo) || '';
        const telefono = this.getXmlValue(client.telefono) || '';        // Descifrar tarjeta
        const tarjeta = tarjetaEncrypted ? this.cryptoUtil.decrypt(tarjetaEncrypted, key) : '';
        
        // Convertir polígono a formato de coordenadas específico
        const poligonoStr = this.formatPolygonFromXml(client.poligono);
        
        return [
          documento,
          nombres,
          apellidos,
          tarjeta,
          tipo,
          telefono,
          poligonoStr,
        ].join(delimiter);
      }).join('\n');
    } catch (error) {
      throw new Error(`Error al convertir XML a TXT: ${error instanceof Error ? error.message : String(error)}`);    }
  }  private getXmlValue(node: string | XmlTextNode | undefined): string {
    if (typeof node === 'string') {
      return node;
    }
    if (typeof node === 'object' && node !== null) {
      // Si es un objeto con propiedades, intentar obtener el texto
      if (typeof node._ === 'string') {
        return node._;
      }
      if (typeof node['#text'] === 'string') {
        return node['#text'];
      }
      // Intentar obtener cualquier propiedad de string directa
      const keys = Object.keys(node);
      for (const key of keys) {
        const value = (node as Record<string, unknown>)[key];
        if (typeof value === 'string') {
          return value;
        }
      }
      // Si es un objeto simple, intentar serializar
      try {
        return JSON.stringify(node);
      } catch {
        return '';
      }
    }
    return '';
  }/**
   * Convierte un polígono GeoJSON al formato de coordenadas específico
   * Formato: ((-90.6795083618164 14.907752838134766, -89.12396514892578 14.9, -90.67 14.89, -90.6795083618164 14.907752838134766))
   */
  private formatPolygonCoordinates(polygon: ClientData['poligono']): string {
    try {
      if (!polygon || polygon.type !== 'Polygon' || !polygon.coordinates || !Array.isArray(polygon.coordinates)) {
        return '';
      }

      // Obtener el primer anillo de coordenadas (anillo exterior)
      const ring = polygon.coordinates[0];
      if (!Array.isArray(ring) || ring.length === 0) {
        return '';
      }

      // Convertir cada par de coordenadas al formato "longitud latitud"
      const coordinateStrings = ring.map((coord) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          return '';
        }
        const lon = coord[0];
        const lat = coord[1];
        
        // Mantener los números como están, sin parseFloat para preservar la precisión
        if (typeof lon !== 'number' || typeof lat !== 'number') {
          return '';
        }
        
        return `${lon} ${lat}`;
      }).filter(str => str !== '');

      if (coordinateStrings.length === 0) {
        return '';
      }

      // Formatear como ((coordenadas))
      return `((${coordinateStrings.join(', ')}))`;
    } catch {
      return '';
    }
  }  /**
   * Convierte un polígono desde XML al formato de coordenadas específico
   */
  private formatPolygonFromXml(poligonoNode: string | XmlTextNode | undefined): string {
    try {
      if (!poligonoNode) {
        return '';
      }

      // Si es un objeto (nodo XML complejo), buscar el campo geoJSON
      if (typeof poligonoNode === 'object' && poligonoNode !== null) {
        const nodeObj = poligonoNode as Record<string, unknown>;
        
        // Buscar campo geoJSON en el nodo XML
        if ('geoJSON' in nodeObj) {
          const geoJSONStr = this.getXmlValue(nodeObj.geoJSON as string | XmlTextNode);
          if (geoJSONStr) {
            try {
              const polygon = JSON.parse(geoJSONStr) as ClientData['poligono'];
              return this.formatPolygonCoordinates(polygon);
            } catch {
              // Si falla el parsing JSON, continuar
            }
          }
        }
        
        // Si no hay geoJSON, intentar obtener el valor completo del nodo
        const poligonoStr = this.getXmlValue(poligonoNode);
        if (poligonoStr) {
          try {
            const polygon = JSON.parse(poligonoStr) as ClientData['poligono'];
            return this.formatPolygonCoordinates(polygon);
          } catch {
            // Si falla, retornar vacío
          }
        }
      } else {
        // Si es un string simple, intentar parsear directamente
        const poligonoStr = this.getXmlValue(poligonoNode);
        if (poligonoStr) {
          try {
            const polygon = JSON.parse(poligonoStr) as ClientData['poligono'];
            return this.formatPolygonCoordinates(polygon);
          } catch {
            // Si falla, retornar vacío
          }
        }
      }

      return '';
    } catch {
      return '';
    }
  }
}