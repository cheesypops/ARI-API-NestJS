// GeoJSON Polygon interface according to RFC 7946
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // Array of linear rings, each ring is an array of [longitude, latitude] positions
  bbox?: number[]; // Optional bounding box
}

// GeoJSON Feature interface for complete OGC compliance
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONPolygon | null;
  properties: {
    [key: string]: any;
  };
  id?: string | number;
}

export interface ClientData {
  documento: string;
  nombres: string;
  apellidos: string;
  tarjeta: string;
  tipo: string;
  telefono: string;
  poligono?: GeoJSONPolygon;
}

export interface ParsedClient {
  documento: string;
  nombres: string;
  apellidos: string;
  tarjeta: string;
  tipo: string;
  telefono: string;
  poligono?: GeoJSONPolygon;
}
