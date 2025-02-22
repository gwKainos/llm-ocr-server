import * as fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import Tesseract, { PSM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist'; // pdfjs-dist v4 사용

// 사각형 영역 인터페이스 – 원하는 텍스트 영역을 지정합니다.
export interface Rect {
  page: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// 지정된 사각형 영역 내의 텍스트를 추출하는 함수
export function getTextInRect(items: any[], rect: Rect): string {
  const filtered = items.filter(
    (item) =>
      item.page === rect.page &&
      item.x >= rect.xMin &&
      item.x <= rect.xMax &&
      item.y >= rect.yMin &&
      item.y <= rect.yMax,
  );
  filtered.sort((a, b) => a.x - b.x);
  return filtered
    .map((item) => item.text)
    .join(' ')
    .trim();
}

export const pdfUtil = {
  // 텍스트 클린업: 연속 공백 및 개행문자 정리
  cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * PDF.js를 사용하여 PDF 파일에서 모든 텍스트 아이템과 그 좌표를 추출합니다.
   */
  async extractTextItemsWithPositions(pdfPath: string): Promise<any[]> {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = (pdfjsLib as any).getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    const items: any[] = [];
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      for (const item of textContent.items) {
        // 일부 아이템은 str와 transform 프로퍼티가 없을 수 있으므로 확인
        if (item.str && item.transform) {
          items.push({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            page: pageNum,
          });
        }
      }
    }
    return items;
  },

  /**
   * 디버깅용: PDF.js로 추출한 raw 텍스트 아이템들을 콘솔에 출력합니다.
   */
  async debugPrintItems(pdfPath: string): Promise<void> {
    const items = await pdfUtil.extractTextItemsWithPositions(pdfPath);
    console.log('Extracted Items:', JSON.stringify(items, null, 2));
  },

  /**
   * PDF의 표 영역(예: 임대인의 주소, 주민등록번호 등)을 좌표(Rect)로 미리 지정하고,
   * 해당 영역 내의 텍스트를 추출하여 JSON 데이터로 반환합니다.
   *
   * ※ Rect 영역 값은 실제 PDF 좌표에 맞게 조정해야 합니다.
   */
  async extractDataUsingPDFjs(pdfPath: string): Promise<any> {
    // 모든 텍스트 아이템 추출
    const items = await pdfUtil.extractTextItemsWithPositions(pdfPath);
    // 디버그: 좌표값 확인 (콘솔 로그로 출력)
    console.log('Extracted Items:', JSON.stringify(items, null, 2));

    // 예시로 임대인의 주소와 주민등록번호 영역을 사각형으로 지정 (실제 PDF 좌표에 맞게 수정 필요)
    const leaseAddressRect: Rect = {
      page: 1,
      xMin: 50, // 왼쪽 여백 기준
      xMax: 400, // 오른쪽 한계
      yMin: 500, // 주소 시작 y 좌표
      yMax: 550, // 주소 끝 y 좌표
    };

    const leaseRegRect: Rect = {
      page: 1,
      xMin: 50, // 주민등록번호 시작 x 좌표
      xMax: 300, // 주민등록번호 끝 x 좌표
      yMin: 450, // 주민등록번호 시작 y 좌표
      yMax: 480, // 주민등록번호 끝 y 좌표
    };

    // 각 영역 내의 텍스트 추출
    const addressText = getTextInRect(items, leaseAddressRect);
    const regNumberText = getTextInRect(items, leaseRegRect);

    // 결과 JSON – 필요에 따라 임차인, 계약 관련 영역도 추가
    const result = {
      임대인: {
        주소: addressText || '정보 없음',
        주민등록번호: regNumberText || '정보 없음',
        전화: '정보 없음',
        성명: '정보 없음',
        대리인: {
          주소: '정보 없음',
          주민등록번호: '정보 없음',
          성명: '정보 없음',
        },
      },
      임차인: {
        주소: '정보 없음',
        주민등록번호: '정보 없음',
        전화: '정보 없음',
        성명: '정보 없음',
        대리인: {
          주소: '정보 없음',
          주민등록번호: '정보 없음',
          성명: '정보 없음',
        },
      },
      '임대차계약 기간': '정보 없음',
      '계약갱신거절 사유': '정보 없음',
    };

    return result;
  },

  /**
   * pdf-parse를 사용하여 PDF 파일의 전체 텍스트를 추출합니다.
   */
  async parsePDF(filePath: string): Promise<string> {
    try {
      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfData = await require('pdf-parse')(pdfBuffer);
      return pdfUtil.cleanText(pdfData.text || '');
    } catch (error) {
      console.error(`Error parsing PDF: ${error.message}`);
      throw new Error('Failed to parse the PDF file');
    }
  },

  /**
   * Tesseract와 Puppeteer를 사용하여 이미지 기반 PDF에서 텍스트를 추출합니다.
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
};
