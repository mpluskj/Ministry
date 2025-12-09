# 상태 토글 성능 최적화 및 M1 참조 제거

## 문제 분석

### 1. 느린 토글 응답 속도
**현재 동작**:
```typescript
await toggleMonthStatus(month, currentStatus);
await loadData(); // 전체 대시보드 데이터 다시 로드 - 느림!
```

**문제점**:
- 상태 토글 후 `loadData()`를 호출하여 모든 대시보드 데이터를 다시 가져옴
- `getInitialDashboardData()` API 호출로 불필요한 데이터까지 로드
- 단순히 하나의 상태만 변경하면 되는데 전체 데이터를 다시 가져옴

### 2. 구식 M1 셀 참조
**발견된 위치**:
- `doPost()` - 보고서 제출 시 마감 확인 (33, 39행)
- `getMonthlyStats()` - 월별 통계 조회 시 상태 확인 (498-499행)
- `doGet()` - 월별 마감 상태 확인 (453행)

**문제점**:
- 각 월 시트의 M1 셀 체크박스는 삭제됨
- 현재는 '집계' 시트 K열에서 마감 상태 관리
- 오래된 코드가 여전히 M1을 참조하고 있음

## 해결 방안

### 1. 상태 토글 최적화

#### Option A: 로컬 상태 업데이트 (권장)
```typescript
// 서버에 토글 요청만 보내고, 로컬 상태만 업데이트
await toggleMonthStatus(month, currentStatus);
// reports 배열에서 해당 월의 상태만 업데이트
setReports(reports.map(r => 
  r.month === month 
    ? { ...r, status: currentStatus === 'COMPLETED' ? 'OPEN' : 'COMPLETED' }
    : r
));
```

**장점**:
- 즉각적인 UI 반응
- 불필요한 네트워크 요청 제거
- 사용자 경험 대폭 향상

**단점**:
- 서버 응답 실패 시 롤백 필요

#### Option B: 부분 데이터 로드
새로운 API 엔드포인트 생성:
```javascript
function getAggregateDataOnly(email) {
  // 집계 데이터만 반환 (관리자 정보, 봉사연도 정보 제외)
}
```

**장점**:
- 서버 상태와 동기화 보장

**단점**:
- 여전히 네트워크 요청 필요
- Option A보다 느림

### 2. M1 참조 제거

#### 변경 위치 1: doPost() - 보고서 제출 시 마감 확인
```javascript
// Before: 각 월 시트의 M1 셀 확인
const monthSheet = sheet.getSheetByName(month);
const isClosedValue = monthSheet.getRange('M1').getValue();

// After: 집계 시트 K열 확인
const aggregateSheet = sheet.getSheetByName('집계');
const dataRange = aggregateSheet.getRange('A2:K13');
const values = dataRange.getValues();
const monthRow = values.find(row => row[0] === month);
const isClosedValue = monthRow ? monthRow[10] : false;
```

#### 변경 위치 2: getMonthlyStats() - 월별 통계 상태 확인
```javascript
// Before: M1 셀 확인
const isClosedValue = monthSheet.getRange('M1').getValue();

// After: 집계 시트에서 이미 로드한 데이터 사용
// (이 함수는 더 이상 사용되지 않을 수 있음 - 확인 필요)
```

#### 변경 위치 3: doGet() - checkStatus 액션
```javascript
// Before: M1 셀 확인
const isClosedValue = monthSheet.getRange('M1').getValue();

// After: 집계 시트 K열 확인
```

## 구현 계획

### Phase 1: 상태 토글 최적화 (Frontend)
1. ✅ `ManagerDashboard.tsx`의 `handleToggleStatus` 수정
   - `loadData()` 호출 제거
   - 로컬 상태 업데이트로 변경
   - 에러 처리 추가 (실패 시 원래 상태로 롤백)

2. ✅ `handleConfirmToggle` 수정
   - 동일한 최적화 적용

### Phase 2: M1 참조 제거 (Backend)
1. ✅ `doPost()` 함수 수정
   - M1 셀 참조 → 집계 시트 K열 참조로 변경

2. ✅ `getMonthlyStats()` 함수 확인
   - 사용 여부 확인
   - 사용 중이면 집계 시트 참조로 변경
   - 사용 안 하면 주석 처리 또는 제거

3. ✅ `doGet()` checkStatus 액션 수정
   - M1 셀 참조 → 집계 시트 K열 참조로 변경

### Phase 3: 검증
1. ✅ 개발 서버에서 테스트
   - 상태 토글 속도 확인
   - 상태 변경이 즉시 반영되는지 확인
   - 에러 처리 동작 확인

2. ✅ 보고서 제출 테스트
   - 마감된 월에 보고서 제출 시 에러 발생 확인
   - 집계 시트 K열 기준으로 마감 확인되는지 검증

## 예상 성능 개선

| 항목 | 이전 | 개선 후 | 개선율 |
|------|------|---------|--------|
| 토글 응답 시간 | ~2-3초 | ~0.1초 | **95%** |
| 네트워크 요청 | 2회 (토글 + 전체 로드) | 1회 (토글만) | **50%** |
| UI 반응성 | 느림 | 즉각적 | **대폭 개선** |

## 주의사항

- 로컬 상태 업데이트 방식은 낙관적 업데이트(Optimistic Update)
- 서버 응답 실패 시 롤백 로직 필수
- M1 참조 제거 후 기존 월 시트의 M1 셀은 사용되지 않음 (삭제 가능)
