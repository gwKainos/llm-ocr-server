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
   * PDF 또는 OCR에서 추출한 텍스트에서 필수 정보(임대인, 임차인, 연락처, 주소, 계약 정보 등)만 추출
   */
  extractDataFromText(text: string): {
    landlord: string;
    landlordPhone: string;
    landlordAddress: string;
    tenant: string;
    tenantPhone: string;
    tenantAddress: string;
    contractPeriod: string;
    renewalRejectionReason: string;
  } {
    const cleanedText = pdfUtil.cleanText(text);

    const extract = (regex: RegExp) => {
      const match = cleanedText.match(regex);
      return match && match[1] ? match[1].trim() : '정보 없음';
    };

    return {
      landlord: extract(/임대인.*?성\s*명[:\s]*([가-힣A-Za-z]+)/),
      landlordPhone: extract(/임대인.*?연락처[:\s]*(\d{3}-\d{3,4}-\d{4})/),
      landlordAddress: extract(/임대인.*?주\s*소[:\s]*([\w가-힣\s]+)/),
      tenant: extract(/임차인.*?성\s*명[:\s]*([가-힣A-Za-z]+)/),
      tenantPhone: extract(/임차인.*?연락처[:\s]*(\d{3}-\d{3,4}-\d{4})/),
      tenantAddress: extract(/임차인.*?주\s*소[:\s]*([\w가-힣\s]+)/),
      contractPeriod: extract(/임대차계약\s*기간[:\s]*([\w\s]+)/),
      renewalRejectionReason: extract(/계약갱신거절\s*사유[:\s]*([\w\s]+)/),
    };
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
        fs.mkdirSync(outputPath, {recursive: true});
      }

      // ✅ Puppeteer 브라우저 설정 수정
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      const fileUrl = `file://${encodeURI(path.resolve(pdfPath))}`;

      await page.goto(fileUrl, {waitUntil: 'networkidle2'});

      const imagePath = path.join(outputPath, 'pdf_page.png');
      await page.screenshot({path: imagePath, fullPage: true});

      await browser.close();

      // ✅ Tesseract Worker 생성 및 초기화
      worker = await Tesseract.createWorker();
      await worker.reinitialize('kor');
      await worker.setParameters({tessedit_pageseg_mode: PSM.SINGLE_BLOCK});

      const {data: {text}} = await worker.recognize(imagePath);
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
  }
};
