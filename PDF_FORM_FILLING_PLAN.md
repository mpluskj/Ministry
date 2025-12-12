# PDF 양식 채우기 방식으로 전환

## 💡 새로운 접근 방법

기존 "회중용 전도인 기록" PDF 양식 파일에 데이터만 채워 넣기

### 장점
1. ✅ **정확한 레이아웃**: 원본 양식과 100% 동일
2. ✅ **간단한 구현**: 레이아웃 코드 불필요
3. ✅ **유지보수 용이**: 양식 변경 시 파일만 교체
4. ✅ **폰트 문제 없음**: 원본 PDF의 폰트 사용

## 🛠️ 구현 방법

### 1. PDF 라이브러리 선택

#### pdf-lib (추천)
```bash
npm install pdf-lib
```

**특징**:
- PDF 양식 필드 채우기 지원
- 체크박스, 텍스트 필드 등 지원
- 브라우저에서 실행 가능
- TypeScript 지원

#### 예제 코드
```typescript
import { PDFDocument } from 'pdf-lib';

async function fillPublisherCard(templatePath: string, data: any) {
  // 1. 템플릿 PDF 로드
  const templateBytes = await fetch(templatePath).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  // 2. 양식 가져오기
  const form = pdfDoc.getForm();
  
  // 3. 필드 채우기
  const nameField = form.getTextField('name');
  nameField.setText(data.name);
  
  const birthDateField = form.getTextField('birthDate');
  birthDateField.setText(data.birthDate);
  
  const maleCheckbox = form.getCheckBox('male');
  if (data.gender === '남') {
    maleCheckbox.check();
  }
  
  const femaleCheckbox = form.getCheckBox('female');
  if (data.gender === '여') {
    femaleCheckbox.check();
  }
  
  // 4. PDF 저장
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
```

### 2. 필요한 작업

#### 2.1. PDF 양식 파일 준비
- 원본 PDF 파일을 프로젝트에 추가
- 경로: `public/templates/publisher_card_template.pdf`

#### 2.2. 필드 이름 확인
PDF 양식의 필드 이름을 확인해야 함:
```typescript
const form = pdfDoc.getForm();
const fields = form.getFields();
fields.forEach(field => {
  const name = field.getName();
  console.log(`Field: ${name}`);
});
```

#### 2.3. 코드 수정
`MonthlyReportDetail.tsx`의 `generatePublisherCard` 함수를 수정:
- jsPDF 대신 pdf-lib 사용
- 레이아웃 코드 제거
- 필드 채우기 코드 추가

## 📋 구현 계획

### Phase 1: 준비
1. ✅ pdf-lib 설치
2. ✅ 원본 PDF 양식 파일 추가
3. ✅ 필드 이름 확인

### Phase 2: 구현
1. ✅ `generatePublisherCard` 함수 수정
2. ✅ 필드 매핑 코드 작성
3. ✅ 테스트

### Phase 3: 검증
1. ✅ 로컬 테스트
2. ✅ 다양한 데이터로 테스트
3. ✅ 사용자 승인

## 🔍 필드 매핑 예상

### 개인정보
- `name` 또는 `성명`: 이름
- `birthDate` 또는 `생년월일`: 생년월일
- `baptismDate` 또는 `침례일자`: 침례일자
- `male` 또는 `남`: 남성 체크박스
- `female` 또는 `여`: 여성 체크박스
- `otherSheep` 또는 `다른양`: 다른 양 체크박스
- `anointed` 또는 `기름부음받은자`: 기름부음받은 자 체크박스

### 직책
- `elder` 또는 `장로`: 장로 체크박스
- `ministerialServant` 또는 `봉사의종`: 봉사의 종 체크박스
- `regularPioneer` 또는 `정규파이오니아`: 정규 파이오니아 체크박스
- `specialPioneer` 또는 `특별파이오니아`: 특별 파이오니아 체크박스
- `missionary` 또는 `야외선교인`: 야외 선교인 체크박스

### 월별 데이터 (12개월)
- `month1_participated` ~ `month12_participated`: 참여 체크박스
- `month1_studies` ~ `month12_studies`: 성서 연구
- `month1_ap` ~ `month12_ap`: 보조 파이오니아 체크박스
- `month1_hours` ~ `month12_hours`: 시간
- `month1_remarks` ~ `month12_remarks`: 비고

### 총계
- `total_studies`: 총 연구
- `total_hours`: 총 시간

## ⚠️ 주의사항

1. **필드 이름**: 실제 PDF의 필드 이름과 일치해야 함
2. **필드 타입**: 텍스트, 체크박스 등 타입 확인 필요
3. **폰트**: 한글 입력 시 폰트 임베딩 필요할 수 있음

## 🎯 다음 단계

1. **PDF 양식 파일 업로드 요청**
   - 사용자에게 원본 PDF 파일 요청
   
2. **pdf-lib 설치**
   ```bash
   npm install pdf-lib
   ```

3. **필드 이름 확인**
   - PDF 파일의 필드 이름 추출

4. **구현**
   - `generatePublisherCard` 함수 수정
