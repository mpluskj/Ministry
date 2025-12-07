// Google Apps Script 웹 앱 URL
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxUSlqPLNeIANcSIsy9dDv4ObHNdD_V2wvbf20CrYHvnr58iu3j6WKVlQFsyq2KS4c/exec';


// 봉사연도 목록 조회
export const getServiceYears = async () => {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getServiceYears`, {
      method: 'GET',
      mode: 'cors',
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '봉사연도 목록 조회 실패');
    }
    return result.data;
  } catch (error) {
    console.error('Error getting service years:', error);
    throw new Error('봉사연도 목록 조회 중 오류가 발생했습니다.');
  }
};

// 봉사연도 변경
export const changeServiceYear = async (spreadsheetId: string) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'changeServiceYear', spreadsheetId }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '봉사연도 변경 실패');
    }
    return result;
  } catch (error) {
    console.error('Error changing service year:', error);
    throw new Error('봉사연도 변경 중 오류가 발생했습니다.');
  }
};

// 구글시트 정보 조회
export const getSpreadsheetInfo = async () => {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getSpreadsheetInfo`, {
      method: 'GET',
      mode: 'cors',
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '구글시트 정보 조회 실패');
    }
    return result.data;
  } catch (error) {
    console.error('Error getting spreadsheet info:', error);
    throw new Error('구글시트 정보 조회 중 오류가 발생했습니다.');
  }
};


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

// 봉사 보고 제출 (Apps Script 사용)
export const submitMinistryReport = async (data: MinistryReport) => {
  try {
    // Apps Script는 POST 요청 본문을 직접 처리하므로, 추가 래핑 없이 데이터를 전송합니다.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // Apps Script 웹 앱은 일반적으로 리디렉션을 처리하므로 'follow'로 설정합니다.
      // CORS 문제는 Apps Script 측에서 처리되므로 'no-cors'는 필요하지 않을 수 있습니다.
      // 먼저 'cors' 모드로 시도하고, 문제가 발생하면 다른 모드를 고려합니다.
      mode: 'cors',
      headers: {
        // Content-Type을 명시적으로 설정하지 않아도 Apps Script가 처리할 수 있지만,
        // 명확성을 위해 text/plain으로 설정하는 것이 좋습니다. (Apps Script는 JSON을 직접 파싱)
        // 'Content-Type': 'application/json' 대신 아래 사용
         'Content-Type': 'text/plain;charset=utf-8', // Apps Script doPost는 e.postData.contents를 사용
      },
      // JSON 문자열로 변환하여 전송
      body: JSON.stringify(data),
    });

    // Apps Script 응답 처리
    const result = await response.json();

    if (!result.success) {
      console.error('Apps Script Error:', result.error);
      throw new Error(result.error || 'Apps Script 처리 중 오류가 발생했습니다.');
    }

    return result; // { success: true } 또는 오류 객체
  } catch (error) {
    console.error('Error submitting report via Apps Script:', error);
    // 네트워크 오류 또는 JSON 파싱 오류 등
    throw new Error(error instanceof Error ? error.message : '보고 제출 중 오류가 발생했습니다.');
  }
};

// 월별 마감 상태 확인 (Apps Script 사용)
export const checkMonthStatus = async (month: string) => {
  try {
    // GET 요청으로 Apps Script URL에 month 파라미터를 추가하여 호출
    const response = await fetch(`${APPS_SCRIPT_URL}?month=${encodeURIComponent(month)}`, {
      method: 'GET',
      mode: 'cors', // 또는 필요에 따라 다른 모드
    });

    const result = await response.json();

    if (result.error) {
       console.error('Apps Script Error (checkMonthStatus):', result.error);
       // 오류가 있더라도 isClosed 상태를 반환할 수 있도록 처리 (Apps Script에서 null 반환 시)
       return { isClosed: null };
    }

    // isClosed가 boolean이 아닐 경우를 대비하여 명시적으로 boolean 변환
    return { isClosed: !!result.isClosed };

  } catch (error) {
    console.error('Error checking month status via Apps Script:', error);
    // 네트워크 오류 등 발생 시 isClosed를 null로 반환하여 UI에서 처리하도록 함
    return { isClosed: null };
  }
};

// 관리자 유형 확인
export const checkManagerType = async (email: string) => {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=checkManager&email=${encodeURIComponent(email)}`, {
      method: 'GET',
      mode: 'cors',
    });

    const result = await response.json();
    return {
      type: result.type, // 'super' | 'group' | null
      groupName: result.groupName, // 집단 관리자인 경우 집단명
      name: result.name // 관리자명(B열)
    };
  } catch (error) {
    console.error('Error checking manager type:', error);
    throw new Error('관리자 권한 확인 중 오류가 발생했습니다.');
  }
};

// 월별 통계 데이터 조회
export const getMonthlyStats = async (month: string, email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=monthlyStats&month=${encodeURIComponent(month)}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    throw new Error('월별 통계 조회 중 오류가 발생했습니다.');
  }
};

// 모든 월별 통계 데이터 한번에 조회
export const getAllMonthlyStats = async (email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=allMonthlyStats&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting all monthly stats:', error);
    throw new Error('전체 월별 통계 조회 중 오류가 발생했습니다.');
  }
};

// 월별 상세 보고 조회
export const getMonthlyDetail = async (month: string, email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=monthlyDetail&month=${encodeURIComponent(month)}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting monthly detail:', error);
    throw new Error('월별 상세 보고 조회 중 오류가 발생했습니다.');
  }
};

// 마감 상태 토글
export const toggleMonthStatus = async (month: string, currentStatus: string) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'toggleStatus',
        month,
        currentStatus
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Error toggling month status:', error);
    throw new Error('마감 상태 변경 중 오류가 발생했습니다.');
  }
};

// 연간 봉사 기록 조회
export const getYearlyReport = async (name: string, email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=yearlyReport&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting yearly report:', error);
    throw new Error('연간 봉사 기록 조회 중 오류가 발생했습니다.');
  }
};

// 미보고자 확인
export const getUnreportedMembers = async (month: string, email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=getUnreportedMembers&month=${encodeURIComponent(month)}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting unreported members:', error);
    throw new Error('미보고자 조회 중 오류가 발생했습니다.');
  }
};

// 전체명단 조회 (전도인카드 출력용)
export const getAllMembers = async (email: string) => {
  try {
    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=getAllMembers&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        mode: 'cors',
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error getting all members:', error);
    throw new Error('전체명단 조회 중 오류가 발생했습니다.');
  }
};