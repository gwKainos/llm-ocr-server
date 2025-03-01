import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OcrModule } from './ocr/ocr.module';
import { PdfController } from './pdf/pdf.controller';
import { PdfModule } from './pdf/pdf.module';

@Module({
  imports: [OcrModule, PdfModule],
  controllers: [AppController, PdfController],
  providers: [AppService],
})
export class AppModule {}
