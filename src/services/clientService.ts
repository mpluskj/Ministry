// Google Sheets API 관련 상수
const SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';
const API_KEY = 'AIzaSyBCMOdCd9HJ9_50WeY4CnGKV6KNyOy568w';

export interface MinistryReport {
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

// 봉사 보고 제출
export const submitMinistryReport = async (data: MinistryReport) => {
  try {
    // 먼저 전체명단에서 사용자 정보 조회
    const listResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/전체명단!A:F?key=${API_KEY}`
    );
    const listData = await listResponse.json();
    const userRow = listData.values?.find((row: any[]) => row[0] === data.name);
    const position = userRow?.[1] || '';
    const rp = userRow?.[2] || '';
    const group = userRow?.[5] || '';

    // 비고 셀 데이터 생성
    const remarksCell = (data.remarks || [])
      .map(r => `${r.type}${r.hours ? ': ' + r.hours + '시간' : ''}${r.etc ? ' - ' + r.etc : ''}`)
      .filter(Boolean)
      .join('\n');

    // 구글 시트에 데이터 추가
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

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${data.month}!A9:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('보고 제출 중 오류가 발생했습니다.');
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting report:', error);
    throw new Error('보고 제출 중 오류가 발생했습니다.');
  }
};

// 월별 마감 상태 확인
export const checkMonthStatus = async (month: string) => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${month}!M1?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('마감 상태 확인 중 오류가 발생했습니다.');
    }

    const data = await response.json();
    const isClosedValue = data.values?.[0]?.[0];
    const isClosed =
      isClosedValue === true ||
      isClosedValue === 'TRUE' ||
      isClosedValue === 'true' ||
      isClosedValue === 1 ||
      isClosedValue === '1';

    return { isClosed };
  } catch (error) {
    console.error('Error checking month status:', error);
    throw new Error('마감 상태 확인 중 오류가 발생했습니다.');
  }
};