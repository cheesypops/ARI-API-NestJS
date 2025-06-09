import { Module } from '@nestjs/common';
import { ConverterController } from './converter.controller';
import { JsonService } from './services/json.service';
import { XmlService } from './services/xml.service';
import { TxtService } from './services/txt.service';
import { ParserService } from './services/parser.service';
import { CryptoUtil } from './utils/crypto.util';

@Module({
  controllers: [ConverterController],
  providers: [
    JsonService,
    XmlService,
    TxtService,
    ParserService,
    CryptoUtil,
  ],
  exports: [
    JsonService,
    XmlService,
    TxtService,
    ParserService,
    CryptoUtil,
  ],
})
export class ConverterModule {}
