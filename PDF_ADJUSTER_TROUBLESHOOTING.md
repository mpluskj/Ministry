## PDF 좌표 조정 도구 - 현재 상태 및 해결 방법

### 🐛 발생한 문제

1. **Grid 컴포넌트 경고**
   ```
   MUI Grid: The `item` prop has been removed
   MUI Grid: The `xs` prop has been removed
   ```

2. **한글 폰트 인코딩 에러** (중요!)
   ```
   WinAnsi cannot encode "김" (0xae40)
   ```

### 🔧 해결 방법

#### 문제 1: Grid 컴포넌트 (경고만, 작동은 됨)
MUI v6에서 Grid 컴포넌트가 변경되었습니다.
- 수정 필요하지만 기능에는 영향 없음

#### 문제 2: 한글 폰트 (치명적 에러)
**원인**: StandardFonts.Helvetica는 한글을 지원하지 않음

**해결책**: Gowun Dodum 폰트를 PDF에 임베드해야 함

### 📝 수정 필요 사항

`PDFCoordinateAdjuster.tsx` 파일의 `generatePDFWithCoordinates` 함수:

```typescript
// 현재 (문제)
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

// 수정 (해결)
// 한글 폰트 로드 및 임베드
let font;
try {
  const fontUrl = '/Ministry/GowunDodum-Regular.ttf';
  const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
  font = await pdfDoc.embedFont(fontBytes);
} catch (error) {
  console.error('한글 폰트 로드 실패:', error);
  // 폴백: 기본 폰트 사용
  font = await pdfDoc.embedFont(StandardFonts.Helvetica);
}
```

### 🎯 임시 해결책

현재 도구를 사용하려면:
1. **영문 이름으로 테스트**: 샘플 데이터의 이름을 영문으로 변경
2. 또는 **수동으로 파일 수정**: 위 코드를 직접 수정

### 다음 단계

1. PDFCoordinateAdjuster.tsx 파일 수정
2. 한글 폰트 임베딩 구현
3. Grid 컴포넌트 prop 수정

수정을 진행할까요?
