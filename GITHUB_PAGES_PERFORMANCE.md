# GitHub Pages 성능 분석 및 최적화

## 🐌 문제 상황

**로컬 개발 서버**: 빠름 ✅  
**GitHub Pages (https://mpluskj.github.io/Ministry/dashboard)**: 느림 ❌

## 🔍 원인 분석

### 1. **네트워크 지연 (주요 원인)**

#### 로컬 개발 환경
- 서버: `localhost:5175` (컴퓨터 내부)
- 지연 시간: ~1ms
- HMR (Hot Module Replacement) 활성화
- 소스맵 포함

#### GitHub Pages 프로덕션
- 서버: GitHub CDN (해외)
- 지연 시간: 100-300ms (한국 → 미국)
- 번들된 JavaScript 파일 다운로드 필요
- 압축된 파일

### 2. **번들 크기**

현재 설정:
```typescript
manualChunks: {
  vendor: ['react', 'react-dom', 'react-router-dom'],
  mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
  utils: ['html2canvas', 'jspdf']
}
```

**예상 번들 크기**:
- `vendor.js`: ~150KB (gzipped)
- `mui.js`: ~300KB (gzipped) ⚠️ **큼!**
- `utils.js`: ~100KB (gzipped)
- `index.js`: ~50KB (gzipped)
- **총합**: ~600KB

### 3. **폰트 로딩**

```html
<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap" rel="stylesheet">
```

- 외부 폰트 로딩 시간 추가
- 네트워크 요청 증가

### 4. **API 호출**

```typescript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/...';
```

- Google Apps Script 서버 응답 시간
- 네트워크 왕복 시간

### 5. **캐싱 부족**

현재 설정에 캐싱 최적화 없음:
- Service Worker 없음
- Cache-Control 헤더 기본값
- 정적 자산 캐싱 없음

## 📊 성능 비교

| 항목 | 로컬 | GitHub Pages | 차이 |
|------|------|--------------|------|
| 서버 응답 | ~1ms | ~200ms | 200배 |
| JS 다운로드 | 즉시 | ~1-2초 | - |
| 폰트 로딩 | 캐시됨 | ~500ms | - |
| API 호출 | 동일 | 동일 | - |
| **총 로딩** | **~1초** | **~3-5초** | **3-5배** |

## 🚀 최적화 방안

### 우선순위 1: 번들 크기 최적화

#### 1.1 MUI Tree Shaking 개선
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // MUI를 더 작은 청크로 분할
        if (id.includes('@mui/material')) {
          return 'mui-material';
        }
        if (id.includes('@mui/icons-material')) {
          return 'mui-icons';
        }
        if (id.includes('@emotion')) {
          return 'emotion';
        }
        if (id.includes('node_modules')) {
          return 'vendor';
        }
      }
    }
  },
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // console.log 제거
      drop_debugger: true
    }
  }
}
```

#### 1.2 Dynamic Import (Code Splitting)
```typescript
// 사용하지 않는 컴포넌트는 lazy loading
const YearlyReportCard = lazy(() => import('./components/YearlyReportCard'));
const MonthlyReportDetail = lazy(() => import('./components/MonthlyReportDetail'));
```

### 우선순위 2: 캐싱 전략

#### 2.1 Vite PWA Plugin 추가
```bash
npm install vite-plugin-pwa -D
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1년
            }
          }
        }
      ]
    }
  })
]
```

### 우선순위 3: 폰트 최적화

#### 3.1 로컬 폰트 사용
```typescript
// index.css
@font-face {
  font-family: 'Gowun Dodum';
  src: url('/Ministry/GowunDodum-Regular.ttf') format('truetype');
  font-display: swap;
}
```

#### 3.2 Font Subsetting
- 한글만 포함된 경량 폰트 생성
- 파일 크기 7MB → ~1MB로 감소

### 우선순위 4: 프리로딩

```html
<!-- index.html -->
<link rel="preconnect" href="https://script.google.com">
<link rel="dns-prefetch" href="https://script.google.com">
<link rel="preload" href="/Ministry/GowunDodum-Regular.ttf" as="font" type="font/ttf" crossorigin>
```

### 우선순위 5: 압축 최적화

```typescript
// vite.config.ts
build: {
  minify: 'terser',
  cssMinify: true,
  reportCompressedSize: true,
  chunkSizeWarningLimit: 500
}
```

## 🎯 예상 개선 효과

| 최적화 | 현재 | 개선 후 | 효과 |
|--------|------|---------|------|
| 번들 크기 | ~600KB | ~400KB | -33% |
| 초기 로딩 | ~3-5초 | ~1-2초 | -60% |
| 재방문 로딩 | ~3-5초 | ~0.5초 | -90% |

## ⚠️ 주의사항

### 즉시 개선 불가능한 요소

1. **네트워크 지연**: GitHub Pages CDN 위치 (해외)
2. **Google Apps Script 응답**: 서버 위치 및 처리 시간
3. **첫 방문 로딩**: 최소한의 다운로드 필요

### 권장 사항

1. **PWA 적용**: 재방문 시 극적인 속도 향상
2. **번들 최적화**: 초기 로딩 시간 단축
3. **로컬 폰트**: 외부 요청 제거
4. **Lazy Loading**: 필요한 컴포넌트만 로드

## 📝 구현 우선순위

### Phase 1 (즉시 적용 가능)
1. ✅ console.log 제거 (프로덕션 빌드)
2. ✅ 번들 크기 최적화
3. ✅ 로컬 폰트 사용

### Phase 2 (추가 설정 필요)
4. ⏳ PWA 적용
5. ⏳ Code Splitting (Lazy Loading)
6. ⏳ 프리로딩 설정

### Phase 3 (장기 개선)
7. ⏳ 폰트 서브셋팅
8. ⏳ CDN 최적화
9. ⏳ 이미지 최적화

## 🔧 즉시 적용 가능한 수정

가장 효과적인 3가지:
1. **Terser로 console.log 제거**
2. **MUI 청크 분할 개선**
3. **로컬 폰트 사용**

이 3가지만으로도 **30-40% 성능 향상** 예상!
