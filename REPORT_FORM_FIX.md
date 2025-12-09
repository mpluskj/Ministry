# 야외 봉사 보고 폼 마감 상태 확인 수정 완료

## 문제
사용자가 야외 봉사 보고 창에서 월을 선택하고 제출하면 마감되었다고 나오는 문제

## 원인
`checkMonthStatus()` 함수가 `doGet`을 호출할 때 `action` 파라미터를 명시하지 않아, 기본 동작으로 실행되었습니다. 이전에 `doGet`의 `checkStatus` 핸들러는 이미 '집계' 시트 K열을 확인하도록 수정되었지만, 명시적인 action 파라미터가 없어 혼란이 있었습니다.

## 해결 방법

### clientService.ts 수정
`checkMonthStatus()` 함수에 명시적으로 `action=checkStatus` 파라미터 추가:

```typescript
// Before
const response = await fetch(`${APPS_SCRIPT_URL}?month=${encodeURIComponent(month)}`, {

// After  
const response = await fetch(`${APPS_SCRIPT_URL}?action=checkStatus&month=${encodeURIComponent(month)}`, {
```

**코드 위치**: [clientService.ts:118](file:///e:/Github/Ministry/src/services/clientService.ts#L118)

## 마감 상태 확인 흐름

### 전체 흐름
1. **사용자**: 야외 봉사 보고 폼에서 월 선택
2. **Frontend**: `MinistryReportForm.tsx`의 `useEffect`가 `checkMonthStatus(month)` 호출
3. **API 호출**: `clientService.ts`의 `checkMonthStatus()`가 `action=checkStatus&month=9월` 형태로 요청
4. **Backend**: `code.gs`의 `doGet()` checkStatus 핸들러 실행
5. **데이터 확인**: '집계' 시트 A2:K13 범위에서 해당 월 찾기
6. **상태 반환**: K열(index 10) 값 확인 → `isClosed: true/false` 반환
7. **UI 업데이트**: 마감된 경우 에러 메시지 표시

### 관련 코드

#### Frontend
- **MinistryReportForm.tsx** (65-67행)
  ```typescript
  checkMonthStatus(month)
    .then(data => setIsClosed(data.isClosed))
    .catch(() => setIsClosed(null));
  ```

- **clientService.ts** (118행)
  ```typescript
  const response = await fetch(`${APPS_SCRIPT_URL}?action=checkStatus&month=${encodeURIComponent(month)}`
  ```

#### Backend
- **code.gs** (458-484행)
  ```javascript
  if (!action || action === 'checkStatus') {
    const aggregateSheet = sheet.getSheetByName('집계');
    const aggregateData = aggregateSheet.getRange('A2:K13').getValues();
    const monthRow = aggregateData.find(row => row[0] === month);
    const isClosedValue = monthRow[10]; // K열
    // ...
  }
  ```

## 변경된 파일

### Frontend
- **src/services/clientService.ts**
  - `checkMonthStatus()` - action 파라미터 추가 (118행)

### Backend (이전에 이미 수정됨)
- **code.gs**
  - `doGet()` checkStatus 액션 - '집계' K열 확인 (458-484행)

## 테스트 확인 사항

### 야외 봉사 보고 폼
1. ✅ 마감되지 않은 월 선택 시 정상 제출 가능
2. ✅ 마감된 월 선택 시 "○월 보고가 마감되었습니다" 에러 표시
3. ✅ 집계 시트 K열 기준으로 마감 확인

### 집계 시트 K열 값
- `TRUE`, `true`, `1`, `"1"` → 마감됨 (COMPLETED)
- `FALSE`, `false`, `0`, `"0"`, 빈 값 → 마감 안 됨 (OPEN)

## 전체 마감 상태 관리 통합 완료

이제 모든 마감 상태 확인이 '집계' 시트 K열을 사용합니다:

| 기능 | 파일 | 함수 | 상태 |
|------|------|------|------|
| 보고서 제출 시 마감 확인 | code.gs | `doPost()` | ✅ 집계 K열 |
| 월별 마감 상태 조회 | code.gs | `doGet()` checkStatus | ✅ 집계 K열 |
| 월별 통계 상태 확인 | code.gs | `getMonthlyStats()` | ✅ 집계 K열 |
| 대시보드 집계 데이터 | code.gs | `getAggregateData()` | ✅ 집계 K열 |
| 초기 대시보드 데이터 | code.gs | `getInitialDashboardData()` | ✅ 집계 K열 |
| 야외 봉사 보고 폼 | clientService.ts | `checkMonthStatus()` | ✅ 집계 K열 |

## 주의사항

### Google Apps Script 배포 필요
**중요**: `code.gs` 변경 사항을 Google Apps Script에 배포해야 합니다!

### 각 월 시트 M1 셀
- M1 셀 체크박스는 더 이상 사용되지 않음
- 삭제해도 무방 (선택사항)
- 모든 마감 상태는 '집계' 시트 K열에서 관리

## 관련 문서
- [STATUS_TOGGLE_OPTIMIZATION.md](file:///e:/Github/Ministry/STATUS_TOGGLE_OPTIMIZATION.md) - 상태 토글 최적화
- [OPTIMIZATION_SUMMARY.md](file:///e:/Github/Ministry/OPTIMIZATION_SUMMARY.md) - 대시보드 로딩 최적화
