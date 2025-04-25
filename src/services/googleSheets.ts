import { gapi } from 'gapi-script';

const CLIENT_ID = '497507205467-hic2647a8dbe9im2n68ljcftc5pf3pkv.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBCMOdCd9HJ9_50WeY4CnGKV6KNyOy568w';
const SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

let initializePromise: Promise<boolean> | null = null;

export const initGoogleAPI = () => {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = new Promise((resolve, reject) => {
    const loadGapiScript = () => {
      return new Promise<void>((scriptResolve, scriptReject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => scriptResolve();
        script.onerror = (error) => scriptReject(error);
        document.body.appendChild(script);
      });
    };

    const initClient = async () => {
      try {
        console.log('Attempting gapi.client.init...');
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES.join(' '),
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
        });
        console.log('gapi.client.init successful.');
        resolve(true);
      } catch (error: any) {
        console.error('Error initializing Google API client:', JSON.stringify(error, null, 2));
        reject(error);
      }
    };

    loadGapiScript()
      .then(() => {
        return new Promise<void>((loadResolve) => {
          console.log('Loading client:auth2 libraries...');
          gapi.load('client:auth2', () => {
            console.log('client:auth2 libraries loaded.');
            loadResolve();
          });
        });
      })
      .then(initClient)
      .catch((error) => {
        console.error('Failed to load or initialize Google API:', error);
        reject(error);
      });
  });

  return initializePromise;
};

export const signInIfNeeded = async () => {
  const auth2 = gapi.auth2.getAuthInstance();
  if (!auth2) {
    throw new Error('Google Auth instance not initialized.');
  }
  if (!auth2.isSignedIn.get()) {
    await auth2.signIn({ scope: SCOPES.join(' ') });
  } else {
    // 이미 로그인된 경우에도 scope가 부족하면 re-authenticate 필요
    const currentScopes = auth2.currentUser.get().getGrantedScopes();
    if (!SCOPES.every(scope => currentScopes.includes(scope))) {
      await auth2.signIn({ scope: SCOPES.join(' ') });
    }
  }
};

interface MinistryReport {
  name: string;
  month: string;
  participated: boolean;
  bibleStudies: string;
  hours: string;
  remarks: Array<{
    type: string;
    hours: string;
    etc?: string;
  }>;
}

export const submitReport = async (data: MinistryReport) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '서버 오류');
  }
  return await response.json();
};

// 집단명 확인 함수
export const checkGroup = async (name: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '전체명단!A:B',
    });

    const rows = response.result.values || [];
    const userRow = rows.find(row => row[0] === name);
    return userRow ? userRow[1] : null;
  } catch (error) {
    console.error('Error checking group:', error);
    throw error;
  }
};

// 마감 여부 확인 함수
export const isMonthClosed = async (month: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
    });

    const value = response.result.values?.[0]?.[0];
    return value === 'TRUE' || value === true;
  } catch (error) {
    console.error('Error checking month status:', error);
    throw error;
  }
};

// 통계 데이터 계산 및 업데이트
export const updateMonthlyStats = async (month: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A9:K`,
    });

    const rows = response.result.values || [];
    
    const stats = {
      totalParticipants: rows.length,
      totalBibleStudies: 0,
      totalHours: 0,
      totalLDC: 0,
      totalRemote: 0,
      totalConvention: 0,
      totalHospital: 0,
      totalPatientVisit: 0,
      totalEtc: 0,
    };

    // 각 행의 데이터 집계
    rows.forEach(row => {
      stats.totalBibleStudies += parseInt(row[3] || '0');
      stats.totalHours += parseInt(row[4] || '0');
      
      for (let i = 5; i < row.length; i++) {
        const remark = row[i] || '';
        if (remark.includes('LDC')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalLDC += hours;
        } else if (remark.includes('원격봉사')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalRemote += hours;
        } else if (remark.includes('대회자원봉사')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalConvention += hours;
        } else if (remark.includes('병교위')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalHospital += hours;
        } else if (remark.includes('환자방문단')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalPatientVisit += hours;
        } else if (remark.includes('기타')) {
          const hours = parseInt(remark.match(/(\d+)시간/)?.[1] || '0');
          stats.totalEtc += hours;
        }
      }
    });

    // 통계 데이터 업데이트 (1~6행)
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A1:B6`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          ['전체 보고자 수', stats.totalParticipants],
          ['총 성서 연구 건수', stats.totalBibleStudies],
          ['총 봉사 시간', stats.totalHours],
          ['LDC 봉사 시간', stats.totalLDC],
          ['원격봉사 시간', stats.totalRemote],
          ['대회자원봉사 시간', stats.totalConvention],
        ],
      },
    });

    // 추가 통계 데이터 업데이트
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!D1:E4`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          ['병교위 시간', stats.totalHospital],
          ['환자방문단 시간', stats.totalPatientVisit],
          ['기타 봉사 시간', stats.totalEtc],
          ['', ''],
        ],
      },
    });

    return stats;
  } catch (error) {
    console.error('Error updating monthly stats:', error);
    throw error;
  }
};

// 관리자 권한 확인
export const checkManagerAccess = async (email: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '집단명!B:C',
    });

    const rows = response.result.values || [];
    const isGroupManager = rows.some(row => row[0] === email);
    const isSuperManager = rows.some(row => row[1] === email);

    return isGroupManager || isSuperManager;
  } catch (error) {
    console.error('Error checking manager access:', error);
    throw error;
  }
};

// 관리자 유형 확인
export const getManagerType = async (email: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '집단명!B:C',
    });

    const rows = response.result.values || [];
    const isSuperManager = rows.some(row => row[1] === email);
    const isGroupManager = rows.some(row => row[0] === email);

    return isSuperManager ? 'super' : (isGroupManager ? 'group' : null);
  } catch (error) {
    console.error('Error getting manager type:', error);
    throw error;
  }
};

// 월별 보고 데이터 조회
export const getMonthlyReports = async (email: string) => {
  try {
    const months = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
    const reports = [];

    for (const month of months) {
      const statsResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${month}!A1:E6`,
      });

      const closedResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${month}!M1`,
      });

      const stats = statsResponse.result.values || [];
      const isClosed = closedResponse.result.values?.[0]?.[0] === 'TRUE';

      reports.push({
        month,
        totalParticipants: stats[0]?.[1] || 0,
        totalHours: stats[2]?.[1] || 0,
        isClosed,
      });
    }

    return reports;
  } catch (error) {
    console.error('Error getting monthly reports:', error);
    throw error;
  }
};

// 월별 상세 보고 데이터 조회
export const getMonthlyReportDetail = async (month: string, managerEmail: string) => {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A9:K`,
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      name: row[0],
      group: row[1],
      participated: row[2] === 'Y',
      bibleStudies: row[3],
      hours: row[4],
      remarks: row.slice(5).filter(Boolean),
    }));
  } catch (error) {
    console.error('Error getting monthly report detail:', error);
    throw error;
  }
};

// 월별 마감 처리
export const updateMonthlyClose = async (month: string, closed: boolean) => {
  try {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!M1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[closed]],
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating monthly close status:', error);
    throw error;
  }
};

// Google API 클라이언트 설정
const CLIENT_ID = '497507205467-hic2647a8dbe9im2n68ljcftc5pf3pkv.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBCMOdCd9HJ9_50WeY4CnGKV6KNyOy568w';
const SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;

export const initGoogleAPI = async () => {
  if (gapiInited && gisInited) return true;

  // gapi 로드
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });

  await new Promise<void>((resolve) => {
    gapi.load('client', resolve);
  });

  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });

  gapiInited = true;

  // gis 로드
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    callback: '', // defined later
  });

  gisInited = true;

  return true;
};

const getAccessToken = async (): Promise<void> => {
  if (!tokenClient) throw new Error('Token client not initialized');
  
  return new Promise((resolve, reject) => {
    try {
      tokenClient!.callback = (resp) => {
        if (resp.error) reject(resp);
        resolve();
      };
      if (gapi.client.getToken() === null) {
        tokenClient!.requestAccessToken();
      } else {
        resolve();
      }
    } catch (err) {
      reject(err);
    }
  });
};

interface MinistryReport {
  name: string;
  month: string;
  participated: boolean;
  bibleStudies: string;
  hours: string;
  remarks?: Array<{
    type: string;
    hours: string;
    etc?: string;
  }>;
}

export const submitReport = async (data: MinistryReport) => {
  await getAccessToken();

  // 전체명단에서 이름과 일치하는 행의 직책(B), RP(C), 집단(F) 추출
  const listResp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '전체명단!A:F',
  });

  const userRow = listResp.result.values?.find(row => row[0] === data.name);
  const position = userRow?.[1] || '';
  const rp = userRow?.[2] || '';
  const group = userRow?.[5] || '';

  // remarks를 줄바꿈으로 구분하여 한 셀에 입력
  const remarksCell = (data.remarks || [])
    .map(r => `${r.type}${r.hours ? ': ' + r.hours + '시간' : ''}${r.etc ? ' - ' + r.etc : ''}`)
    .filter(Boolean)
    .join('\n');

  const values = [
    [
      data.name,
      data.month,
      data.participated ? 'Y' : 'N',
      data.bibleStudies,
      data.hours,
      remarksCell,
      '',
      '',
      rp,
      '',
      position,
      group
    ],
  ];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${data.month}!A9`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });

  return { success: true };
};

export const checkManagerAccess = async (email: string) => {
  await getAccessToken();

  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '집단명!A:C',
  });

  const rows = response.result.values || [];
  const isSuperManager = rows.slice(0, 2).some(row => row[2] === email);
  const isGroupManager = rows.slice(4).some(row => row[2] === email);

  return isSuperManager || isGroupManager;
};

export const getMonthlyStats = async (month: string, email: string) => {
  await getAccessToken();

  // 관리자 유형 및 집단 확인
  const managerResp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '집단명!A:C',
  });

  const managerRows = managerResp.result.values || [];
  const isSuperManager = managerRows.slice(0, 2).some(row => row[2] === email);
  const groupManagerRow = managerRows.slice(4).find(row => row[2] === email);
  const managerGroup = groupManagerRow ? groupManagerRow[0] : null;

  // 해당 월의 데이터 조회
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!A9:L`,
  });

  let rows = response.result.values || [];
  
  // 집단 관리자인 경우 해당 집단 데이터만 필터링
  if (!isSuperManager && managerGroup) {
    rows = rows.filter(row => row[11] === managerGroup);
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
  return stats;
};

export const getMonthStatus = async (month: string) => {
  await getAccessToken();
  
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!M1`,
  });

  const isClosedValue = response.result.values?.[0]?.[0];
  const isClosed =
    isClosedValue === true ||
    isClosedValue === 'TRUE' ||
    isClosedValue === 'true' ||
    isClosedValue === 1 ||
    isClosedValue === '1';

  return { isClosed };
};

export const toggleMonthStatus = async (month: string, currentStatus: string) => {
  await getAccessToken();

  const newStatus = currentStatus === 'COMPLETED' ? 'CLOSED' : 'COMPLETED';
  
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!M1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[newStatus]]
    }
  });

  return { status: newStatus };
};