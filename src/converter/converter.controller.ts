import { Controller, Post, UploadedFile, UseInterceptors, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JsonService } from './services/json.service';
import { XmlService } from './services/xml.service';
import { TxtService } from './services/txt.service';
import { Response } from 'express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

@Controller('converter')
export class ConverterController {
  constructor(
    private jsonService: JsonService,
    private xmlService: XmlService,
    private txtService: TxtService,
  ) {}
  @Post('txt-to-json')
  @UseInterceptors(FileInterceptor('file'))
  txtToJson(
    @UploadedFile() file: MulterFile | undefined,
    @Body('delimiter') delimiter: string,
    @Body('key') key: string,
    @Res() res: Response,
  ): void {
    try {
      if (!file || !delimiter || !key) {
        throw new HttpException('Falta archivo, delimitador o llave', HttpStatus.BAD_REQUEST);
      }

      const content = file.buffer.toString('utf8');
      
      // Validar formato TXT antes de procesar
      this.validateTxtFormat(content, delimiter);
      
      const json = this.jsonService.generateJson(content, delimiter, key);
      
      res.setHeader('Content-Type', 'application/json');
      res.send(json);
    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      throw new HttpException(
        `Error procesando el archivo, verifica el formato del archivo y el delimitador.`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @Post('txt-to-xml')
  @UseInterceptors(FileInterceptor('file'))
  txtToXml(
    @UploadedFile() file: MulterFile | undefined,
    @Body('delimiter') delimiter: string,
    @Body('key') key: string,
    @Res() res: Response,
  ): void {
    try {
      if (!file || !delimiter || !key) {
        throw new HttpException('Falta archivo, delimitador o llave', HttpStatus.BAD_REQUEST);
      }
      
      const content = file.buffer.toString('utf8');
      
      // Validar formato TXT antes de procesar
      this.validateTxtFormat(content, delimiter);
      
      const xml = this.xmlService.generateXml(content, delimiter, key);
      
      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      throw new HttpException(
        `Error procesando el archivo, verifica el formato del archivo y el delimitador.`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('json-xml-to-txt')
  @UseInterceptors(FileInterceptor('file'))
  async jsonXmlToTxt(
    @UploadedFile() file: MulterFile | undefined,
    @Body('key') key: string,
    @Body('delimiter') delimiter: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!file || !key || !delimiter) {
        throw new HttpException('Falta archivo, delimitador o llave', HttpStatus.BAD_REQUEST);
      }
      
      const content = file.buffer.toString('utf8');
      const fileType = file.mimetype;
      let txt: string;      if (fileType === 'application/json' || file.originalname.endsWith('.json')) {
        // Validar formato JSON antes de procesar
        this.validateJsonFormat(content);
        txt = this.txtService.jsonToTxt(content, key, delimiter);
      } else if (fileType === 'application/xml' || fileType === 'text/xml' || file.originalname.endsWith('.xml')) {
        // Validar formato XML antes de procesar
        this.validateXmlFormat(content);
        txt = await this.txtService.xmlToTxt(content, key, delimiter);
      } else {
        throw new HttpException(
          `Tipo de archivo no permitido: ${fileType}. Tipos con soporte: JSON, XML`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(txt);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error procesando el archivo, verifica el formato del archivo y el delimitador.`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateXmlFormat(xmlContent: string): void {
    try {
      // Verificar que contenga la estructura básica requerida
      const requiredElements = [
        '<clientes>',
        '<cliente>',
        '<documento>',
        '<nombres>',
        '<apellidos>',
        '<tarjeta>',
        '<tipo>',
        '<telefono>',
        '</cliente>',
        '</clientes>'
      ];

      // Verificar que todos los elementos requeridos estén presentes
      for (const element of requiredElements) {
        if (!xmlContent.includes(element)) {
          throw new Error(`Elemento requerido ${element} no encontrado en el XML`);
        }
      }

      // Verificar formato del polígono si está presente
      if (xmlContent.includes('<poligono>')) {
        const polygonPattern = /<poligono>\s*POLYGON\s*\(\((.+?)\)\)\s*<\/poligono>/i;
        const polygonMatches = xmlContent.match(polygonPattern);
        
        if (!polygonMatches) {
          throw new Error('El formato del polígono debe ser: <poligono>POLYGON ((coordenadas))</poligono>');
        }

        // Verificar que las coordenadas tengan el formato correcto
        const coordinates = polygonMatches[1];
        const coordPattern = /^(-?\d+\.?\d*\s+-?\d+\.?\d*,?\s*)+$/;
        
        if (!coordPattern.test(coordinates.trim())) {
          throw new Error('Las coordenadas del polígono deben tener el formato: "lon lat, lon lat, ..."');
        }
      }
    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      throw new HttpException(
        `Formato de XML no válido.`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private validateTxtFormat(txtContent: string, delimiter: string): void {
    try {
      const lines = txtContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        throw new Error('El archivo TXT está vacío');
      }

      lines.forEach((line, index) => {
        const parts = line.split(delimiter);
        
        // El formato esperado tiene 7 campos: documento;nombres;apellidos;tarjeta;tipo;telefono;coordenadas
        if (parts.length !== 7) {
          throw new Error(`Línea ${index + 1}: Se esperan 7 campos separados por '${delimiter}', se encontraron ${parts.length}`);
        }

        // Verificar que los campos obligatorios no estén vacíos
        const [documento, nombres, apellidos, tarjeta, tipo, telefono, coordenadas] = parts;
        
        if (!documento.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'documento' no puede estar vacío`);
        }
        if (!nombres.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'nombres' no puede estar vacío`);
        }
        if (!apellidos.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'apellidos' no puede estar vacío`);
        }
        if (!tarjeta.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'tarjeta' no puede estar vacío`);
        }
        if (!tipo.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'tipo' no puede estar vacío`);
        }
        if (!telefono.trim()) {
          throw new Error(`Línea ${index + 1}: El campo 'telefono' no puede estar vacío`);
        }

        // Verificar formato de coordenadas si están presentes
        if (coordenadas.trim()) {
          const coordPattern = /^\(\((-?\d+\.?\d*\s+-?\d+\.?\d*,?\s*)+\)\)$/;
          if (!coordPattern.test(coordenadas.trim())) {
            throw new Error(`Línea ${index + 1}: El formato de coordenadas debe ser ((lon lat, lon lat, ...)) | Recibido: "${coordenadas}"`);
          }
        }
      });
    } catch (error) {// eslint-disable-line @typescript-eslint/no-unused-vars
      throw new HttpException(
        `Formato de TXT no válido.`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
  private validateJsonFormat(jsonContent: string): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(jsonContent);
      
      // Verificar estructura básica
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!parsed.clientes || !Array.isArray(parsed.clientes)) {
        throw new Error('El JSON debe contener un array "clientes"');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (parsed.clientes.length === 0) {
        throw new Error('El array "clientes" no puede estar vacío');
      }      // Verificar cada cliente
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      parsed.clientes.forEach((cliente: any, index: number) => {
        if (!cliente || typeof cliente !== 'object') {
          throw new Error(`Cliente ${index + 1}: Debe ser un objeto válido`);
        }

        // Verificar campos obligatorios
        const requiredFields = ['documento', 'nombres', 'apellidos', 'tarjeta', 'tipo', 'telefono'];
        requiredFields.forEach(field => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!cliente[field] || (typeof cliente[field] === 'string' && cliente[field].trim() === '')) {
            throw new Error(`Cliente ${index + 1}: El campo '${field}' es requerido y no puede estar vacío`);
          }
        });

        // Verificar formato del polígono si está presente
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (cliente.poligono) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (typeof cliente.poligono !== 'object' || cliente.poligono.type !== 'Polygon') {
            throw new Error(`Cliente ${index + 1}: El polígono debe ser un objeto GeoJSON válido con type "Polygon"`);
          }
          
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!cliente.poligono.coordinates || !Array.isArray(cliente.poligono.coordinates)) {
            throw new Error(`Cliente ${index + 1}: El polígono debe tener un array "coordinates"`);
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (cliente.poligono.coordinates.length === 0 || !Array.isArray(cliente.poligono.coordinates[0])) {
            throw new Error(`Cliente ${index + 1}: El polígono debe tener al menos un anillo de coordenadas`);
          }
        }
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new HttpException('JSON malformado: no se puede parsear', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        `Formato de JSON no válido.`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}