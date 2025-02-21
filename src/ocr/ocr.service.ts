import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { fileUtil } from '../utils/file.util';
import { pdfUtil } from "../utils/pdf.util";

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

  async processPDF(file: Express.Multer.File): Promise<{ message: string; data: any }> {
    if (!file || !file.path) {
      this.logger.error(`Invalid file data: ${JSON.stringify(file)}`);
      throw new BadRequestException('Invalid file data');
    }

    const originalPath = file.path;

    try {
      // PDF 텍스트 추출
      let extractedText = await pdfUtil.parsePDF(originalPath);

      // OCR 필요 여부 체크
      if (!extractedText || extractedText.length < 10) {
        this.logger.debug('PDF seems to be an image-based document. Applying OCR...');
        extractedText = await pdfUtil.extractTextUsingOCR(originalPath);
      }

      // 추출된 데이터 파싱
      const extractedData = pdfUtil.extractDataFromText(extractedText);

      return {
        message: 'File OCRed successfully',
        data: extractedData,
      };
    } catch (error) {
      this.logger.error(`Error processing file: ${error.message}`);
      throw new BadRequestException('Failed to process the uploaded file');
    } finally {
      fileUtil.deleteFile(originalPath);
    }
  }
}
