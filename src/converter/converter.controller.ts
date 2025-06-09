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
        throw new HttpException('Missing file, delimiter, or key', HttpStatus.BAD_REQUEST);
      }

      const content = file.buffer.toString('utf8');
      const json = this.jsonService.generateJson(content, delimiter, key);
      
      res.setHeader('Content-Type', 'application/json');
      res.send(json);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
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
        throw new HttpException('Missing file, delimiter, or key', HttpStatus.BAD_REQUEST);
      }
      
      const content = file.buffer.toString('utf8');
      const xml = this.xmlService.generateXml(content, delimiter, key);
      
      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
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
        throw new HttpException('Missing file, key, or delimiter', HttpStatus.BAD_REQUEST);
      }
      
      const content = file.buffer.toString('utf8');
      const fileType = file.mimetype;
      let txt: string;
      
      if (fileType === 'application/json' || file.originalname.endsWith('.json')) {
        txt = this.txtService.jsonToTxt(content, key, delimiter);
      } else if (fileType === 'application/xml' || fileType === 'text/xml' || file.originalname.endsWith('.xml')) {
        txt = await this.txtService.xmlToTxt(content, key, delimiter);
      } else {
        throw new HttpException(
          `Unsupported file type: ${fileType}. Supported types: JSON, XML`,
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
        `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}