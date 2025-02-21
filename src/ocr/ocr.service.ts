import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { fileUtil } from '../utils/file.util';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private uploadPath: string = fileUtil.getUploadPath();

  constructor() {}

  async processFile(
    file: Express.Multer.File,
  ): Promise<{ text: string; parsedData: any }> {
    if (!file || !file.path) {
      this.logger.error(`Invalid file data: ${JSON.stringify(file)}`);
      throw new BadRequestException('Invalid file data');
    }

    const originalPath = file.path;

    try {
      const normalizedText = '';
      const mappedData = [];
      return { text: normalizedText, parsedData: mappedData };
    } catch (error) {
      this.logger.error(`Error processing file: ${error.message}`);
      throw new BadRequestException('Failed to process the uploaded file');
    } finally {
      fileUtil.deleteFile(originalPath);
    }
  }
}
