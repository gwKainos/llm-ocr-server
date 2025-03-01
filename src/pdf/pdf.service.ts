// pdf.service.ts
import { Injectable } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PdfService {
  // Express.Multer.File 객체를 받아 PDF 텍스트를 추출하는 함수
  async extractText(file: Express.Multer.File): Promise<string> {
    let buffer: Buffer;
    if (file.path) {
      // 디스크에 저장된 경우
      buffer = require('fs').readFileSync(file.path);
    } else if (file.buffer) {
      // 메모리 저장소인 경우
      buffer = file.buffer;
    } else {
      throw new Error('파일 내용을 찾을 수 없습니다.');
    }
    const data = await pdfParse(buffer);
    return data.text;
  }

  // PDF 전체 텍스트에서 임대인과 임차인의 데이터를 추출하는 함수
  extractData(text: string): any {
    // PDF 내에서 '임대인'과 '임차인'이라는 키워드를 기준으로 섹션을 분리합니다.
    // 실제 텍스트의 구조에 따라 아래 정규식은 조정이 필요합니다.
    const partyRegex = /임\s*대\s*인([\s\S]*?)임\s*차\s*인([\s\S]*)/;
    const match = text.match(partyRegex);

    if (!match) {
      // 분리 실패 시 전체 데이터를 단일 객체로 반환하거나 예외 처리
      return { message: '임대인/임차인 섹션을 찾을 수 없습니다.' };
    }

    const lessorSection = match[1];
    const lesseeSection = match[2];

    const lessorData = this.extractFields(lessorSection);
    const lesseeData = this.extractFields(lesseeSection);

    return {
      임대인: lessorData,
      임차인: lesseeData,
    };
  }

  // 각 섹션(임대인 또는 임차인)에서 개별 필드를 추출하는 헬퍼 함수
  extractFields(section: string): any {
    // 주민등록번호: 6자리-7자리
    const regNoMatch = section.match(/(\d{6}-\d{7})/);
    // 전화번호: 2~3자리-3~4자리-4자리
    const phoneMatch = section.match(/(\d{2,3}-\d{3,4}-\d{4})/);
    // 성명: '성\s*명' 뒤에 나오는 한글 단어 (예: "홍길동")
    const nameMatch = section.match(/성\s*명\s*([가-힣]+)/);
    // 주소: '주\s*소' 뒤에 나오는 한글/숫자 조합 (간략 예시)
    const addressMatch = section.match(/주\s*소\s*([\uac00-\ud7a3\d\-\s]+)/);

    // 대리인 정보 추출 (대리인이라는 키워드 이후 내용)
    let proxy = {};
    const proxyMatch = section.match(/대\s*리\s*인([\s\S]*)/);
    if (proxyMatch) {
      const proxySection = proxyMatch[1];
      const proxyName = proxySection.match(/성\s*명\s*([가-힣]+)/);
      const proxyRegNo = proxySection.match(/(\d{6}-\d{7})/);
      const proxyAddress = proxySection.match(
        /주\s*소\s*([\uac00-\ud7a3\d\-\s]+)/,
      );
      proxy = {
        성명: proxyName ? proxyName[1].trim() : null,
        주민등록번호: proxyRegNo ? proxyRegNo[1].trim() : null,
        주소: proxyAddress ? proxyAddress[1].trim() : null,
      };
    }

    return {
      성명: nameMatch ? nameMatch[1].trim() : null,
      주민등록번호: regNoMatch ? regNoMatch[1].trim() : null,
      전화번호: phoneMatch ? phoneMatch[1].trim() : null,
      주소: addressMatch ? addressMatch[1].trim() : null,
      대리인: proxy,
    };
  }
}
