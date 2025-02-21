# llm-ocr-server
문서 데이터 인식
파일 업로드

### NestJS 프로젝트 생성
```shell
$ nest new llm-ocr-server
 : npm
```

### 필요한 패키지 설치
```shell
$ npm install tesseract.js multer sharp @nestjs/platform-express 
$ npm install --save-dev @types/multer
```

### OCR 기본 구조 세팅
```shell
$ nest g res ocr
```

## 이슈 해결
### Corresponding file is not included in tsconfig.json
```shell
$ npm install --save-dev @types/node
```

### npm audit fix --force가 실행되지 않는 이유 (package-lock.json 있는지 확인)
```shell
$ rm -rf node_modules package-lock.json
$ npm install
$ npm audit fix --force

# 파일 생성이 안될 경우
$ cat ~/.npmrc
package-lock=false
$ npm config set package-lock true

# 중복 버전 제거
npm dedupe

# 보안 체크
npm audit
```
