import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 모든 기능이 Google Apps Script로 이전됨
// 이 서버는 더 이상 사용되지 않습니다.

// 모든 API 기능이 Google Apps Script로 이전됨













const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
