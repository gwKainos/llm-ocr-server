// pdf.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // 파일이 저장될 경로
        filename: (req, file, cb) => {
          const filename = `${Date.now()}-${file.originalname}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async extract(@UploadedFile() file: Express.Multer.File) {
    // 업로드된 파일의 경로를 통해 텍스트 추출
    const text = await this.pdfService.extractText(file);
    // 추출된 텍스트에서 원하는 데이터 추출
    const data = this.pdfService.extractData(text);
    return { text, data };
  }
}
