import { join } from 'path';
import * as fs from 'fs';

export const fileUtil = {
  /**
   * 업로드된 파일의 기본 저장 경로를 반환합니다.
   */
  getUploadPath(): string {
    return join(process.cwd(), 'data');
  },

  /**
   * 현재 시간과 랜덤 숫자를 기반으로 새로운 파일명을 생성합니다.
   * 형식: YYYYMMDDHHMMSS_랜덤4자리.extension
   *
   * @param extension 사용할 파일 확장자
   * @returns 생성된 파일명
   */
  generateFilename(extension: string): string {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${timestamp}_${randomNumber}.${extension}`;
  },

  /**
   * 지정한 경로의 파일을 삭제합니다.
   *
   * @param filePath 삭제할 파일 경로
   */
  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },
};
