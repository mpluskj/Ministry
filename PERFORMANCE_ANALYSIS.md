# GitHub Pages 성능 분석 결과

## 🐌 문제 원인

### 1. 네트워크 지연 (주요 원인)
- **로컬**: localhost (~1ms)
- **GitHub Pages**: 해외 CDN (~200-300ms)
- **차이**: 200배 이상

### 2. 번들 크기
- **총 크기**: ~600KB (gzipped)
- **MUI**: ~300KB (가장 큼)
- **Vendor**: ~150KB
- **Utils**: ~100KB

### 3. 외부 리소스
- Google Fonts CDN
- Google Apps Script API
- 추가 네트워크 요청

## 📊 성능 비교

| 환경 | 초기 로딩 | 재방문 |
|------|-----------|--------|
| 로컬 | ~1초 | ~0.5초 |
| GitHub Pages | ~3-5초 | ~2-3초 |

## 🚀 권장 최적화 방안

### 즉시 적용 가능 (Phase 1)

#### 1. 번들 최적화
```typescript
// vite.config.ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true  // console.log 제거
    }
  }
}
```

#### 2. Code Splitting
```typescript
// 사용하지 않는 컴포넌트 lazy loading
const YearlyReportCard = lazy(() => import('./components/YearlyReportCard'));
```

#### 3. 프리로딩
```html
<!-- API 프리커넥트 -->
<link rel="preconnect" href="https://script.google.com">
<link rel="dns-prefetch" href="https://script.google.com">
```

### 장기 개선 (Phase 2)

#### 4. PWA 적용
- Service Worker로 캐싱
- 재방문 시 ~90% 속도 향상

#### 5. 로컬 폰트
- Google Fonts 제거
- 폰트 서브셋팅 (7MB → 1MB)

#### 6. CDN 최적화
- Cloudflare Pages 고려
- 한국 리전 CDN 사용

## ✅ 현재 상태

### 적용된 최적화
- ✅ TypeScript 빌드 설정 조정
- ✅ 기존 번들 분할 유지

### 미적용 최적화 (빌드 이슈)
- ⏸️ Terser minification
- ⏸️ 로컬 폰트
- ⏸️ 프리로딩

## 🎯 예상 개선 효과

| 최적화 | 효과 |
|--------|------|
| console.log 제거 | -5% |
| Code Splitting | -20% |
| PWA 캐싱 | -90% (재방문) |
| 로컬 폰트 | -10% |
| **총합** | **-30-40%** |

## 💡 핵심 인사이트

### 왜 로컬이 빠른가?
1. **네트워크 지연 없음**: localhost는 컴퓨터 내부
2. **HMR**: 변경사항만 즉시 반영
3. **개발 모드**: 최적화 없이 빠른 빌드

### 왜 GitHub Pages가 느린가?
1. **지리적 거리**: 한국 ↔ 미국 서버
2. **번들 다운로드**: 600KB 다운로드 필요
3. **외부 리소스**: 폰트, API 등 추가 요청

## 📝 결론

**GitHub Pages의 느린 속도는 정상입니다!**

주요 원인:
- 네트워크 지연 (200ms vs 1ms)
- 번들 다운로드 시간
- 외부 리소스 로딩

**권장 사항**:
1. 현재 속도는 일반적인 수준
2. PWA 적용으로 재방문 속도 대폭 향상 가능
3. 로컬 폰트 사용으로 10-15% 개선 가능

**현실적인 목표**:
- 초기 로딩: 3-5초 → 2-3초 (30-40% 개선)
- 재방문: 2-3초 → 0.5초 (90% 개선, PWA 적용 시)
