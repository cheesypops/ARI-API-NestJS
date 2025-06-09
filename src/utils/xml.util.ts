import { parseString } from 'xml2js';
import * as xmlbuilder from 'xmlbuilder';

/**
 * Parsea XML a objeto JSON (versión asíncrona)
 * @param xml - String XML a parsear
 * @returns Promise con el objeto JSON
 */
export function parseXmlToJson(xml: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!xml || xml.trim() === '') {
      reject(new Error('XML no puede estar vacío'));
      return;
    }

    parseString(xml, { 
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: true,
      trim: true
    }, (err, result) => {
      if (err) {
        reject(new Error(`Error al parsear XML: ${err.message}`));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Parsea XML a objeto JSON (versión síncrona usando xml2js)
 * @param xml - String XML a parsear
 * @returns Objeto JSON
 */
export function parseXmlToJsonSync(xml: string): unknown {
  if (!xml || xml.trim() === '') {
    throw new Error('XML no puede estar vacío');
  }

  let result: unknown;
  let hasError = false;
  let errorMessage = '';

  parseString(xml, { 
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: true,
    normalize: true,
    normalizeTags: true,
    trim: true
  }, (err, parsed) => {
    if (err) {
      hasError = true;
      errorMessage = `Error al parsear XML: ${err.message}`;
    } else {
      result = parsed as unknown;
    }
  });

  if (hasError) {
    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Valida si un string es XML válido
 * @param xml - String a validar
 * @returns true si es XML válido, false en caso contrario
 */
export function isValidXml(xml: string): boolean {
  try {
    parseXmlToJsonSync(xml);
    return true;
  } catch {
    return false;
  }
}

/**
 * Construye XML desde un objeto JSON usando xmlbuilder
 * @param json - Objeto JSON a convertir
 * @param rootElement - Nombre del elemento raíz (opcional)
 * @returns String XML
 */
export function buildXmlFromJson(json: { [name: string]: any }, rootElement?: string): string {
  try {
    if (!json) {
      throw new Error('JSON no puede estar vacío');
    }

    let xmlObj: { [name: string]: any } = json;
    
    // Si se especifica un elemento raíz y el JSON no lo tiene, lo agregamos
    if (rootElement && !(rootElement in json)) {
      xmlObj = { [rootElement]: json };
    }

    const xmlBuilder = xmlbuilder.create(xmlObj);
    return xmlBuilder.end({ pretty: true });
  } catch (error) {
    throw new Error(`Error al construir XML: ${error instanceof Error ? error.message : String(error)}`);
  }
}
