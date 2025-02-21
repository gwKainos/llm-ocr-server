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
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.logger.debug(`Received file: ${JSON.stringify(file)}`);

    if (!file) {
      throw new BadRequestException('No file Ocred');
    }

    if (!file.filename) {
      throw new BadRequestException('Invalid file data: Missing filename');
    }

    const filePath = await this.ocrService.processFile(file);
    return { message: 'File Ocred successfully', path: filePath };
  }
}
