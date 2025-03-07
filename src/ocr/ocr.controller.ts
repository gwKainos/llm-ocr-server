/* ocr.controller.ts */
import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.logger.debug(`Received file: ${JSON.stringify(file)}`);
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!file.filename) {
      throw new BadRequestException('Invalid file data: Missing filename');
    }
    const result = await this.ocrService.processFile(file);
    return { message: 'File processed successfully', ...result };
  }

  @Post('/pdf')
  @UseInterceptors(FileInterceptor('file'))
  async processPDF(@UploadedFile() file: Express.Multer.File) {
    this.logger.debug(`Received file: ${JSON.stringify(file)}`);
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!file.filename) {
      throw new BadRequestException('Invalid file data: Missing filename');
    }
    const result = await this.ocrService.processPDF(file);
    return { message: 'File processed successfully', ...result };
  }
}
