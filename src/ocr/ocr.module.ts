import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from "./ocr.service";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './data',
        filename: (req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
          const randomNumber = Math.floor(1000 + Math.random() * 9000);
          cb(null, `${timestamp}_${randomNumber}${file.originalname.slice(-4)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
