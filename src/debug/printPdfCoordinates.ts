import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist'; // v4 사용
import * as path from 'path'; // 수정: import * as path from 'path';

// PDF 파일 내 텍스트 아이템과 좌표를 추출하는 함수
export async function extractTextItemsWithPositions(pdfPath: string): Promise<any[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = (pdfjsLib as any).getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const items: any[] = [];
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
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
}

// 디버그 함수: PDF 파일의 모든 텍스트 아이템과 좌표를 콘솔에 출력합니다.
export async function printPdfCoordinates(pdfPath: string): Promise<void> {
  const items = await extractTextItemsWithPositions(pdfPath);
  console.log('=== PDF 텍스트 아이템 및 좌표 ===');
  items.forEach((item) => {
    console.log(`페이지: ${item.page}, x: ${item.x}, y: ${item.y}, 텍스트: "${item.text}"`);
  });
}

async function run() {
  const pdfPath = path.resolve('./data/test.pdf'); // PDF 파일의 절대 경로 사용
  await printPdfCoordinates(pdfPath);
}

run();
