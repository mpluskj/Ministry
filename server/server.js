import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';
const KEYFILEPATH = './src/services/service-account.json'; // 서비스 계정 키 파일 경로

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

app.post('/api/report', async (req, res) => {
  try {
    const { name, month, participated, bibleStudies, hours, remarks } = req.body;
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 마감 여부 확인
    const closedResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
    });
    const isClosedValue = closedResp.data.values?.[0]?.[0];
    const isClosed =
      isClosedValue === true ||
      isClosedValue === 'TRUE' ||
      isClosedValue === 'true' ||
      isClosedValue === 1 ||
      isClosedValue === '1';
    if (isClosed) {
      return res.status(400).json({ error: `${month} 보고가 마감되었습니다.` });
    }

    // 전체명단에서 이름과 일치하는 행의 직책(B), RP(C), 집단(F) 추출
    const listResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '전체명단!A:F',
    });
    const listRows = listResp.data.values || [];
    const userRow = listRows.find(row => row[0] === name);
    const position = userRow?.[1] || '';
    const rp = userRow?.[2] || '';
    const group = userRow?.[5] || '';

    // remarks를 줄바꿈으로 구분하여 한 셀에 입력
    const remarksCell = (remarks || [])
      .map(r => `${r.type}${r.hours ? ': ' + r.hours + '시간' : ''}${r.etc ? ' - ' + r.etc : ''}`)
      .filter(Boolean)
      .join('\n');
    const values = [
      [
        name,         // A
        month,        // B
        participated ? 'Y' : 'N', // C
        bibleStudies, // D
        hours,        // E
        remarksCell,  // F (비고)
        '',           // G (예비)
        '',           // H (예비)
        rp,           // I (RP)
        '',           // J (예비)
        position,     // K (직책)
        group         // L (집단)
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A9`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error appending report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/is-closed', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month 파라미터가 필요합니다.' });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const closedResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
    });
    const isClosedValue = closedResp.data.values?.[0]?.[0];
    const isClosed =
      isClosedValue === true ||
      isClosedValue === 'TRUE' ||
      isClosedValue === 'true' ||
      isClosedValue === 1 ||
      isClosedValue === '1';
    res.json({ isClosed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 월별 상세 통계 조회
app.get('/api/monthly-stats', async (req, res) => {
  try {
    const { month, email } = req.query;
    if (!month) return res.status(400).json({ error: 'month 파라미터가 필요합니다.' });
    if (!email) return res.status(400).json({ error: 'email 파라미터가 필요합니다.' });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 관리자 유형 및 집단 확인
    const managerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '집단명!A:C',
    });
    const managerRows = managerResponse.data.values || [];
    const isSuperManager = managerRows.slice(0, 2).some(row => row[2] === email);
    const groupManagerRow = managerRows.slice(4).find(row => row[2] === email);
    const managerGroup = groupManagerRow ? groupManagerRow[0] : null;

    // 해당 월의 모든 데이터 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A9:L`,
    });

    let rows = response.data.values || [];
    
    // 집단 관리자인 경우 해당 집단 데이터만 필터링
    if (!isSuperManager && managerGroup) {
      rows = rows.filter(row => row[11] === managerGroup); // L열(집단)이 관리자의 집단과 일치하는 것만
    }

    const stats = {
      totalReporters: rows.length,
      totalBibleStudies: 0,
      rpCount: 0,
      rpHours: 0,
      rpStudies: 0,
      apCount: 0,
      apHours: 0,
      apStudies: 0,
    };

    // 각 행의 데이터 분석
    rows.forEach(row => {
      const isRp = (row[8] || '').toUpperCase() === 'RP';
      const isAp = (row[8] || '').toUpperCase() === 'AP';
      const hours = parseInt(row[4] || '0');
      const studies = parseInt(row[3] || '0');

      if (isRp) {
        stats.rpCount++;
        stats.rpHours += hours;
        stats.rpStudies += studies;
      } else if (isAp) {
        stats.apCount++;
        stats.apHours += hours;
        stats.apStudies += studies;
      }
      
      stats.totalBibleStudies += studies;
    });

    stats.publisherCount = stats.totalReporters - stats.rpCount - stats.apCount;
    res.json(stats);
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 월별 상세 보고 데이터 조회
app.get('/api/monthly-detail', async (req, res) => {
  try {
    const { month, email } = req.query;
    if (!month) return res.status(400).json({ error: 'month 파라미터가 필요합니다.' });
    if (!email) return res.status(400).json({ error: 'email 파라미터가 필요합니다.' });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 관리자 유형 및 집단 확인
    const managerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '집단명!A:C',
    });
    const managerRows = managerResponse.data.values || [];
    const isSuperManager = managerRows.slice(0, 2).some(row => row[2] === email);
    const groupManagerRow = managerRows.slice(4).find(row => row[2] === email);
    const managerGroup = groupManagerRow ? groupManagerRow[0] : null;

    // 해당 월의 데이터 조회
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A9:L`,
    });

    let rows = response.data.values || [];

    // 집단 관리자인 경우 해당 집단 데이터만 필터링
    if (!isSuperManager && managerGroup) {
      rows = rows.filter(row => row[11] === managerGroup); // L열(집단)이 관리자의 집단과 일치하는 것만
    }

    const details = rows.map(row => ({
      name: row[0],
      group: row[11],
      participated: row[2] === 'Y',
      bibleStudies: row[3],
      hours: row[4],
      remarks: (row[5] || '').split('\n').filter(Boolean),
      rp: row[8],
      position: row[10]
    }));

    res.json(details);
  } catch (error) {
    console.error('Error getting monthly report detail:', error);
    res.status(500).json({ error: error.message });
  }
});

// 마감 상태 토글
app.post('/api/toggle-status', async (req, res) => {
  try {
    const { month, currentStatus } = req.body;
    if (!month) return res.status(400).json({ error: 'month 파라미터가 필요합니다.' });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // M1 셀의 값을 토글
    const newStatus = currentStatus === 'COMPLETED' ? 'CLOSED' : 'COMPLETED';
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
      valueInputOption: 'RAW',
      resource: {
        values: [[newStatus]]
      }
    });

    res.json({ status: newStatus });
  } catch (error) {
    console.error('Error toggling month status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 마감 상태 조회 API 수정
app.get('/api/status', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month 파라미터가 필요합니다.' });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
    });

    const status = response.data.values?.[0]?.[0] || 'CLOSED';
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 관리자 유형 확인
app.post('/api/manager-type', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email 파라미터가 필요합니다.' });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    // 집단명 시트 전체 데이터 조회 (A: 구분, B: 이름, C: 구글계정)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '집단명!A:C',
    });

    const rows = response.data.values || [];
    
    // A1~A2 행이 최고관리자
    const isSuperManager = rows.slice(0, 2).some(row => row[2] === email); // C열 확인

    // A5 행부터 집단관리자
    const groupManagerRow = rows.slice(4).find(row => row[2] === email); // C열 확인
    
    if (isSuperManager) {
      res.json({ type: 'super' });
    } else if (groupManagerRow) {
      res.json({ 
        type: 'group',
        groupName: groupManagerRow[0] // A열의 집단명
      });
    } else {
      res.json({ type: null });
    }
  } catch (error) {
    console.error('Error checking manager type:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
