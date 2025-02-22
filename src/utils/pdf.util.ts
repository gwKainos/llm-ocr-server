/* pdf.util.ts */
import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import puppeteer from 'puppeteer';
import Tesseract, { PSM } from 'tesseract.js';
import path from 'path';

export const pdfUtil = {
  /**
   * 공백 및 개행 문자를 정리하는 함수
   */
  cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * PDF 또는 OCR에서 추출한 텍스트에서 임대인 및 임차인 관련 정보를 계층 구조로 추출합니다.
   *
   * 추출 필드:
   * - 임대인.주소, 임대인.주민등록번호, 임대인.전화, 임대인.성명
   * - 임대인.대리인.주소, 임대인.대리인.주민등록번호, 임대인.대리인.성명
   * - 임차인.주소, 임차인.주민등록번호, 임차인.전화, 임차인.성명
   * - 임차인.대리인.주소, 임차인.대리인.주민등록번호, 임차인.대리인.성명
   * - 계약기간, 계약갱신거절 사유
   *
   * OCR나 PDF 파싱 결과에서 불필요한 공백이나 줄바꿈으로 인해 마커가 분리되어 인식될 수 있으므로,
   * 각 마커에 대해 글자 사이의 임의의 공백을 허용하는 유연한 정규표현식을 사용합니다.
   */
  extractDataFromText(text: string): {
    landlord: {
      address: string;
      registrationNumber: string;
      phone: string;
      name: string;
      agent: {
        address: string;
        registrationNumber: string;
        name: string;
      };
    };
    tenant: {
      address: string;
      registrationNumber: string;
      phone: string;
      name: string;
      agent: {
        address: string;
        registrationNumber: string;
        name: string;
      };
    };
    contractPeriod: string;
    renewalRejectionReason: string;
  } {
    const cleanedText = pdfUtil.cleanText(text);

    // 마커 배열: PDF 내 실제 마커와 일치해야 합니다.
    // OCR 결과에 따라 마커 사이에 불필요한 공백이 끼어들 수 있으므로,
    // 추후 필요에 따라 마커 값을 수정하거나 확장할 수 있습니다.
    const markers = [
      { key: 'landlord.address', marker: '임대인.주소' },
      { key: 'landlord.registrationNumber', marker: '임대인.주민등록번호' },
      { key: 'landlord.phone', marker: '임대인.전화' },
      { key: 'landlord.name', marker: '임대인.성명' },
      { key: 'landlord.agent.address', marker: '임대인.대리인.주소' },
      {
        key: 'landlord.agent.registrationNumber',
        marker: '임대인.대리인.주민등록번호',
      },
      { key: 'landlord.agent.name', marker: '임대인.대리인.성명' },
      { key: 'tenant.address', marker: '임차인.주소' },
      { key: 'tenant.registrationNumber', marker: '임차인.주민등록번호' },
      { key: 'tenant.phone', marker: '임차인.전화' },
      { key: 'tenant.name', marker: '임차인.성명' },
      { key: 'tenant.agent.address', marker: '임차인.대리인.주소' },
      {
        key: 'tenant.agent.registrationNumber',
        marker: '임차인.대리인.주민등록번호',
      },
      { key: 'tenant.agent.name', marker: '임차인.대리인.성명' },
      { key: 'contractPeriod', marker: '임대차계약 기간' },
      { key: 'renewalRejectionReason', marker: '계약갱신거절 사유' },
    ];

    // 결과 객체 기본 구조
    const result = {
      landlord: {
        address: '정보 없음',
        registrationNumber: '정보 없음',
        phone: '정보 없음',
        name: '정보 없음',
        agent: {
          address: '정보 없음',
          registrationNumber: '정보 없음',
          name: '정보 없음',
        },
      },
      tenant: {
        address: '정보 없음',
        registrationNumber: '정보 없음',
        phone: '정보 없음',
        name: '정보 없음',
        agent: {
          address: '정보 없음',
          registrationNumber: '정보 없음',
          name: '정보 없음',
        },
      },
      contractPeriod: '정보 없음',
      renewalRejectionReason: '정보 없음',
    };

    // 도우미 함수: 'a.b.c' 형태의 키를 계층 객체에 할당
    function assignValue(obj: any, key: string, value: string) {
      const keys = key.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }

    // 각 글자 사이에 임의의 공백을 허용하는 마커를 생성하는 함수
    function buildFlexibleMarker(marker: string): string {
      return marker
        .split('')
        .map((ch) => ch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join('\\s*');
    }

    // 각 마커에 대해 순차적으로 값을 추출
    markers.forEach((entry, index) => {
      // 이후 마커들을 lookahead로 사용하여 해당 영역의 종료점을 결정합니다.
      const nextMarkers = markers.slice(index + 1).map((e) => e.marker);
      const flexibleMarker = buildFlexibleMarker(entry.marker);
      const nextMarkersPattern =
        nextMarkers.length > 0
          ? nextMarkers.map((m) => buildFlexibleMarker(m)).join('|')
          : '$';
      // 패턴: 유연한 마커 + 선택적 콜론 및 공백, 이후 캡쳐 그룹(값) + lookahead (다음 마커 또는 문자열 끝)
      const pattern =
        flexibleMarker +
        '\\s*[:：]?\\s*(.*?)\\s*(?=(' +
        nextMarkersPattern +
        ')|$)';
      const regex = new RegExp(pattern, 'i');
      const match = cleanedText.match(regex);
      const value = match && match[1] ? match[1].trim() : '정보 없음';
      assignValue(result, entry.key, value);
    });

    return result;
  },

  /**
   * OCR을 사용하여 이미지 기반 PDF에서 텍스트를 추출하는 함수 (puppeteer 사용)
   */
  async extractTextUsingOCR(pdfPath: string): Promise<string> {
    let browser;
    let worker;

    try {
      const outputPath = path.join(__dirname, '../output');
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      const fileUrl = `file://${encodeURI(path.resolve(pdfPath))}`;
      await page.goto(fileUrl, { waitUntil: 'networkidle2' });

      const imagePath = path.join(outputPath, 'pdf_page.png');
      await page.screenshot({ path: imagePath, fullPage: true });

      await browser.close();

      worker = await Tesseract.createWorker();
      await worker.reinitialize('kor');
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

      const {
        data: { text },
      } = await worker.recognize(imagePath);
      return pdfUtil.cleanText(text);
    } catch (error) {
      console.error(`Error extracting text using OCR: ${error.message}`);
      throw new Error('Failed to extract text using OCR');
    } finally {
      if (browser) await browser.close();
      if (worker) await worker.terminate();
    }
  },

  /**
   * PDF에서 텍스트를 직접 추출하는 함수
   */
  async parsePDF(filePath: string): Promise<string> {
    try {
      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfUtil.cleanText(pdfData.text || '');
    } catch (error) {
      console.error(`Error parsing PDF: ${error.message}`);
      throw new Error('Failed to parse the PDF file');
    }
  },
};
