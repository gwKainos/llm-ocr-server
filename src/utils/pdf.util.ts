import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import puppeteer from 'puppeteer';
import Tesseract from 'tesseract.js';
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

    const landlordMatch = cleanedText.match(/임대인.*?성\s*명[:\s]*([가-힣A-Za-z]+)/);
    const landlordPhoneMatch = cleanedText.match(/임대인.*?연락처[:\s]*(\d{3}-\d{3,4}-\d{4})/);
    const landlordAddressMatch = cleanedText.match(/임대인.*?주\s*소[:\s]*([\w가-힣\s]+)/);

    const tenantMatch = cleanedText.match(/임차인.*?성\s*명[:\s]*([가-힣A-Za-z]+)/);
    const tenantPhoneMatch = cleanedText.match(/임차인.*?연락처[:\s]*(\d{3}-\d{3,4}-\d{4})/);
    const tenantAddressMatch = cleanedText.match(/임차인.*?주\s*소[:\s]*([\w가-힣\s]+)/);

    const contractPeriodMatch = cleanedText.match(/임대차계약\s*기간[:\s]*([\w\s]+)/);
    const renewalRejectionMatch = cleanedText.match(/계약갱신거절\s*사유[:\s]*([\w\s]+)/);

    return {
      landlord: landlordMatch ? landlordMatch[1].trim() : '정보 없음',
      landlordPhone: landlordPhoneMatch ? landlordPhoneMatch[1].trim() : '정보 없음',
      landlordAddress: landlordAddressMatch ? landlordAddressMatch[1].trim() : '정보 없음',
      tenant: tenantMatch ? tenantMatch[1].trim() : '정보 없음',
      tenantPhone: tenantPhoneMatch ? tenantPhoneMatch[1].trim() : '정보 없음',
      tenantAddress: tenantAddressMatch ? tenantAddressMatch[1].trim() : '정보 없음',
      contractPeriod: contractPeriodMatch ? contractPeriodMatch[1].trim() : '정보 없음',
      renewalRejectionReason: renewalRejectionMatch ? renewalRejectionMatch[1].trim() : '정보 없음',
    };
  },

  /**
   * OCR을 사용하여 이미지 기반 PDF에서 텍스트를 추출하는 함수 (puppeteer 사용)
   */
  async extractTextUsingOCR(pdfPath: string): Promise<string> {
    try {
      const outputPath = path.join(__dirname, '../output');
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, {recursive: true});
      }

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      const fileUrl = `file://${path.resolve(pdfPath)}`;

      await page.goto(fileUrl, {waitUntil: 'networkidle2'});

      const imagePath = path.join(outputPath, 'pdf_page.png');
      await page.screenshot({path: imagePath, fullPage: true});

      await browser.close();

      const {data: {text}} = await Tesseract.recognize(imagePath, 'kor');

      return pdfUtil.cleanText(text);
    } catch (error) {
      console.error(`Error extracting text using OCR: ${error.message}`);
      throw new Error('Failed to extract text using OCR');
    }
  },

  /**
   * PDF에서 텍스트를 직접 추출하는 함수
   */
  async parsePDF(filePath: string): Promise<string> {
    try {
      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfUtil.cleanText(pdfData.text);
    } catch (error) {
      console.error(`Error parsing PDF: ${error.message}`);
      throw new Error('Failed to parse the PDF file');
    }
  }
};
