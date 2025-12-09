// 기본 스프레드시트 ID
const DEFAULT_SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';

// 현재 스프레드시트 ID 가져오기 (PropertiesService 사용)
function getCurrentSpreadsheetId() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty('CURRENT_SPREADSHEET_ID') || DEFAULT_SPREADSHEET_ID;
}

// 현재 스프레드시트 ID 설정
function setCurrentSpreadsheetId(spreadsheetId) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('CURRENT_SPREADSHEET_ID', spreadsheetId);
}

// POST 요청 처리 (보고서 제출 또는 상태 토글)
function doPost(e) {
  try {
    const SPREADSHEET_ID = getCurrentSpreadsheetId();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = JSON.parse(e.postData.contents);

    // 액션에 따라 분기
    if (data.action === 'toggleStatus') {
      return handleToggleStatus(sheet, data.month);
    } else if (data.action === 'changeServiceYear') {
      // 봉사연도 변경 처리
      return handleChangeServiceYear(data.spreadsheetId);
    } else {
      // 기존 보고서 제출 로직
      const { name, month, participated, bibleStudies, hours, remarks } = data;

    // 1. 마감 여부 확인 (집계 시트 K열)
    const aggregateSheet = sheet.getSheetByName('집계');
    if (!aggregateSheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: '집계 시트를 찾을 수 없습니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 집계 시트에서 해당 월의 마감 상태 확인
    const aggregateData = aggregateSheet.getRange('A2:K13').getValues();
    const monthRow = aggregateData.find(row => row[0] === month);
    
    if (!monthRow) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: `${month} 데이터를 집계 시트에서 찾을 수 없습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const isClosedValue = monthRow[10]; // K열 (index 10)
    const isClosed = isClosedValue === true || isClosedValue === 'TRUE' || isClosedValue === 'true' || isClosedValue === 1 || isClosedValue === '1';

    if (isClosed) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: `${month} 보고가 마감되었습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 월 시트 확인 (데이터 추가용)
    const monthSheet = sheet.getSheetByName(month);
    if (!monthSheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: `${month} 시트를 찾을 수 없습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 전체명단에서 사용자 정보 조회 (A: 이름, B: 직책, C: RP, F: 집단)
    const listSheet = sheet.getSheetByName('전체명단');
    const listData = listSheet.getRange('A2:F200').getValues()
      .filter(row => row[0] || row[1] || row[2] || row[3] || row[4] || row[5]); // 빈 행 제거
    let position = '';
    let rp = '';
    let group = '';
    for (let i = 0; i < listData.length; i++) {
      if (listData[i][0] === name) {
        position = listData[i][1]; // B열
        rp = listData[i][2];       // C열
        group = listData[i][5];    // F열
        break;
      }
    }

    // 3. 비고 셀 데이터 생성
    const remarksCell = (remarks || [])
      .map(r => {
        if (r.type && r.hours) {
          return `${r.type}: ${r.hours}시간`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    // 4. 해당 월 시트에 데이터 추가 (A9부터 시작)
    // 이름(A), 참여(C), 연구(D), 시간(E), 비고(F), 구분(I), 직책(J), 집단(K)
    // Note: Month (B) is not part of the row data according to the new structure.
    // Note: G and H are empty placeholders.
    const rowData = [
      name,                     // A (0)
      month,                    // B (1) - 월 데이터 추가
      participated ? 'Y' : 'N', // C (2)
      bibleStudies,             // D (3)
      hours,                    // E (4)
      remarksCell,              // F (5)
      '',                       // G (6) - 예비
      '',                       // H (7) - 예비
      rp,                       // I (8) - 구분 (Assuming 'rp' from '전체명단' C is '구분')
      position,                 // J (9) - 직책 (From '전체명단' B)
      group                     // K (10) - 집단 (From '전체명단' F)
    ];
    monthSheet.appendRow(rowData); // Appends 11 columns (A-K)

      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 월별 상세 보고 데이터 조회 함수
function getMonthlyDetail(sheet, month, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    const groupManager = managerData.slice(4).find(row => row[2] === email);
    const managerGroup = groupManager ? groupManager[0] : null;

    const monthSheet = sheet.getSheetByName(month);
    if (!monthSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: `${month} 시트를 찾을 수 없습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // A9부터 K120까지 데이터 범위 설정 (최적화: 범위 축소)
    const dataRange = monthSheet.getRange('A9:K120');
    let rows = dataRange.getValues().filter(row => {
      // 이름(A열)이 있는 행만 필터링 (빈 행 제외)
      return row[0] && String(row[0]).trim() !== '';
    });

    // 집단 관리자인 경우 필터링
    if (!isSuperManager && managerGroup) {
      rows = rows.filter(row => row[10] === managerGroup); // K열(집단) index 10
    }
    
    // 데이터가 없는 경우 빈 배열 반환
    if (rows.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 필요한 데이터만 추출하여 반환 (A: 이름, C: 참여, D: 연구, E: 시간, F: 비고, I: 구분, J: 직책, K: 집단)
    const reportDetails = rows.map(row => ({
      // Indices based on new structure: A(0), C(2), D(3), E(4), F(5), I(8), J(9), K(10)
      name: row[0], // A열: 이름
      participated: String(row[2]).toUpperCase() === 'Y', // C열: 참여 (Y/N)
      bibleStudies: row[3] || 0, // D열: 연구
      hours: row[4] || 0, // E열: 시간
      remarks: row[5] || '', // F열: 비고
      division: row[8] || '', // I열: 구분
      position: row[9] || '', // J열: 직책
      group: row[10] || '' // K열: 집단
    }));

    return ContentService.createTextOutput(JSON.stringify(reportDetails))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getMonthlyDetail: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getYearlyReport(sheet, name, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    const groupManager = managerData.slice(4).find(row => row[2] === email);
    const managerGroup = groupManager ? groupManager[0] : null;

    // 전체명단 시트에서 사용자 정보 조회
    const listSheet = sheet.getSheetByName('전체명단');
    const listData = listSheet.getRange('A2:L200').getValues()
      .filter(row => row[0] || row[1]); // 빈 행 제거 (이름 또는 직책이 있는 행만)
    let userInfo = {};
    for (let i = 0; i < listData.length; i++) {
      if (listData[i][0] === name) {
        const birthDate = listData[i][3] ? new Date(listData[i][3]) : null;
        const baptismDate = listData[i][4] ? new Date(listData[i][4]) : null;
        userInfo = {
          name: listData[i][0], // A열: 성명
          birthDate: birthDate ? Utilities.formatDate(birthDate, 'GMT+9', 'yyyy. M. d.') : '', // D열: 생년월일
          gender: listData[i][6] || '', // G열: 성별
          baptismDate: baptismDate ? Utilities.formatDate(baptismDate, 'GMT+9', 'yyyy. M. d.') : '', // E열: 침례일자
          hope: listData[i][7] || '', // I열: 다른 양/기름부음받은 자
          isElder: listData[i][1] === '장로', // B열: 직책
          isMinisterialServant: listData[i][1] === '봉사의 종',
          isRegularPioneer: listData[i][2] === 'RP', // C열: RP (정규 파이오니아)
          isSpecialPioneer: listData[i][2] === 'SP', // C열: SP (특별 파이오니아)
          isMissionary: listData[i][2] === 'FM' // C열: FM (야외 선교인)
        };
        break;
      }
    }

    const months = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
    const monthlyRecords = [];

    for (const month of months) {
      const monthSheet = sheet.getSheetByName(month);
      let recordFound = false;
      if (monthSheet) {
        const dataRange = monthSheet.getRange('A9:K120');
        let rows = dataRange.getValues().filter(row => {
          return row[0] && String(row[0]).trim() === name;
        });

        // 집단 관리자인 경우 필터링
        if (!isSuperManager && managerGroup) {
          rows = rows.filter(row => row[10] === managerGroup); // K열(집단) index 10
        }

        if (rows.length > 0) {
          const row = rows[0];
          const bibleStudies = row[3] ? Number(row[3]) : 0;
          const hours = row[4] ? Number(row[4]) : 0;
          monthlyRecords.push({
            month: month,
            participated: String(row[2]).toUpperCase() === 'Y', // C열: 참여
            bibleStudies: bibleStudies, // D열: 연구
            hours: hours, // E열: 시간
            remarks: row[5] || '', // F열: 비고
            division: row[8] || '' // I열: 구분
          });
          recordFound = true;
        }
      }
      
      if (!recordFound) {
        monthlyRecords.push({
          month: month,
          participated: false,
          bibleStudies: 0,
          hours: 0,
          remarks: '',
          division: ''
        });
      }
    }

    const yearlyReportData = {
      userInfo: userInfo,
      monthlyRecords: monthlyRecords
    };

    return ContentService.createTextOutput(JSON.stringify(yearlyReportData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getYearlyReport: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 마감 상태 토글 처리 함수 (집계 시트 K열 사용)
function handleToggleStatus(sheet, month) {
  try {
    const aggregateSheet = sheet.getSheetByName('집계');
    if (!aggregateSheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: '집계 시트를 찾을 수 없습니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const dataRange = aggregateSheet.getDataRange();
    const values = dataRange.getValues();
    
    // 월에 해당하는 행 찾기 (A열: index 0)
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // 1행부터 데이터
      if (values[i][0] === month) {
        rowIndex = i + 1; // 1-based index (SpreadsheetApp uses 1-based)
        break;
      }
    }

    if (rowIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: `${month} 데이터를 집계 시트에서 찾을 수 없습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // K열 (11번째 열) 값 확인 및 토글
    const statusCell = aggregateSheet.getRange(rowIndex, 11);
    const currentValue = statusCell.getValue();
    const isClosed = currentValue === true || String(currentValue).toUpperCase() === 'TRUE' || currentValue === 1 || String(currentValue) === '1';
    
    // 상태 토글
    const newValue = !isClosed;
    statusCell.setValue(newValue);

    return ContentService.createTextOutput(JSON.stringify({ success: true, newStatus: newValue ? 'COMPLETED' : 'OPEN' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleToggleStatus: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청 처리 (관리자 확인, 월별 통계, 월별 상세, 연간 보고, 마감 상태 확인)
function doGet(e) {
  try {
    const SPREADSHEET_ID = getCurrentSpreadsheetId();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = e.parameter.action;
    
    // 관리자 확인 요청 처리
    if (e.parameter.action === 'checkManager') {
      const email = e.parameter.email;
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const managerSheet = sheet.getSheetByName('집단명');
      if (!managerSheet) {
        return ContentService.createTextOutput(JSON.stringify({ type: null, error: '집단명 시트를 찾을 수 없습니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const managerData = managerSheet.getRange('A1:C20').getValues()
        .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
      
      // 이메일로 사용자 정보 찾기 (C열, index 2)
      const userRow = managerData.find(row => row[2] && row[2].toString().trim().toLowerCase() === email.trim().toLowerCase());
      
      if (userRow) {
        const roleOrGroup = userRow[0]; // A열(index 0): 관리자 또는 집단명
        const name = userRow[1]; // B열(index 1): 이름
        
        if (roleOrGroup === '최고관리자') {
          // 최고관리자인 경우
          return ContentService.createTextOutput(JSON.stringify({ 
            type: 'super', 
            name: name 
          })).setMimeType(ContentService.MimeType.JSON);
        } else if (roleOrGroup) { // A열에 값이 있는 경우 (집단명으로 간주)
          // 집단 관리자 또는 해당 집단 소속 사용자
          // 현재 로직에서는 A열이 '최고관리자'가 아니면 모두 'group' 타입으로 처리
          return ContentService.createTextOutput(JSON.stringify({ 
            type: 'group', 
            groupName: roleOrGroup, // A열 값을 집단명으로 사용
            name: name 
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
           // A열이 비어있는 경우 등 예외 처리 (권한 없음)
           return ContentService.createTextOutput(JSON.stringify({ type: null }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } else {
        // 시트에 해당 이메일이 없는 경우 (권한 없음)
        return ContentService.createTextOutput(JSON.stringify({ type: null }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 월별 통계 조회 요청 처리
    if (e.parameter.action === 'monthlyStats') {
      const month = e.parameter.month;
      const email = e.parameter.email;
      if (!month || !email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'month와 email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getMonthlyStats(sheet, month, email);
    }

    // 월별 상세 보고 조회 요청 처리
    if (e.parameter.action === 'monthlyDetail') {
      const month = e.parameter.month;
      const email = e.parameter.email;
      if (!month || !email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'month와 email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getMonthlyDetail(sheet, month, email);
    }

    // 연간 봉사 기록 요청 처리
    if (e.parameter.action === 'yearlyReport') {
      const name = e.parameter.name;
      const email = e.parameter.email;
      if (!name || !email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'name과 email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getYearlyReport(sheet, name, email);
    }

    // 봉사연도 목록 조회 요청 처리
    if (e.parameter.action === 'getServiceYears') {
      return getServiceYears();
    }

    // 구글시트 정보 조회 요청 처리
    if (e.parameter.action === 'getSpreadsheetInfo') {
      return getSpreadsheetInfo();
    }
    
    // 미보고자 조회 요청 처리
    if (e.parameter.action === 'getUnreportedMembers') {
      const month = e.parameter.month;
      const email = e.parameter.email;
      if (!month || !email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'month와 email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getUnreportedMembers(sheet, month, email);
    }
    
    // 전체 명단 조회 요청 처리
    if (e.parameter.action === 'getAllMembers') {
      const email = e.parameter.email;
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getAllMembers(sheet, email);
    }
    
    // 집계 데이터 조회 요청 처리 (대시보드 최적화)
    if (e.parameter.action === 'aggregateData') {
      const email = e.parameter.email;
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getAggregateData(sheet, email);
    }
    
    // 초기 대시보드 데이터 통합 조회 (성능 최적화 - 신규)
    if (e.parameter.action === 'getInitialDashboardData') {
      const email = e.parameter.email;
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'email 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return getInitialDashboardData(email);
    }

    // 전체 마감 상태 조회 (비동기 업데이트용) - 더 이상 사용 안 함
    // if (e.parameter.action === 'checkAllMonthStatuses') {
    //    return getAllMonthStatuses(sheet);
    // }
    
    // 월별 마감 상태 확인 요청 처리 (action 파라미터가 없거나 명시적으로 'checkStatus'일 때)
    if (!action || action === 'checkStatus') {
      const month = e.parameter.month;
      if (!month) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'month 파라미터가 필요합니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // 집계 시트에서 마감 상태 확인
      const aggregateSheet = sheet.getSheetByName('집계');
      if (!aggregateSheet) {
        return ContentService.createTextOutput(JSON.stringify({ isClosed: null, error: '집계 시트를 찾을 수 없습니다.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const aggregateData = aggregateSheet.getRange('A2:K13').getValues();
      const monthRow = aggregateData.find(row => row[0] === month);
      
      if (!monthRow) {
        return ContentService.createTextOutput(JSON.stringify({ isClosed: null, error: `${month} 데이터를 집계 시트에서 찾을 수 없습니다.` }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const isClosedValue = monthRow[10]; // K열 (index 10)
      const isClosed = isClosedValue === true || String(isClosedValue).toUpperCase() === 'TRUE' || isClosedValue === 1 || String(isClosedValue) === '1';
      return ContentService.createTextOutput(JSON.stringify({ isClosed: isClosed }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 알 수 없는 액션 처리
    return ContentService.createTextOutput(JSON.stringify({ error: '알 수 없는 GET 요청 액션입니다.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
     Logger.log('Error in doGet: ' + error);
    // 오류 발생 시 isClosed를 포함하여 반환할 수 있도록 수정 (클라이언트 호환성)
    return ContentService.createTextOutput(JSON.stringify({ isClosed: null, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 월별 통계 계산 함수
function getMonthlyStats(sheet, month, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    const groupManager = managerData.slice(4).find(row => row[2] === email);
    const managerGroup = groupManager ? groupManager[0] : null;

    const monthSheet = sheet.getSheetByName(month);
    if (!monthSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: `${month} 시트를 찾을 수 없습니다.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // A9부터 K120까지 데이터 범위 설정 (최적화: 범위 축소)
    const dataRange = monthSheet.getRange('A9:K120');
    let rows = dataRange.getValues().filter(row => {
      // 이름(A열)이 있는 행만 필터링 (빈 행 제외)
      return row[0] && String(row[0]).trim() !== '';
    });

    // 집단 관리자인 경우 필터링
    if (!isSuperManager && managerGroup) {
      rows = rows.filter(row => row[10] === managerGroup); // K열(집단) index 10
    }

    // 마감 상태 확인 (집계 시트 K열)
    const aggregateSheet = sheet.getSheetByName('집계');
    let status = 'OPEN';
    
    if (aggregateSheet) {
      const aggregateData = aggregateSheet.getRange('A2:K13').getValues();
      const monthRow = aggregateData.find(row => row[0] === month);
      
      if (monthRow) {
        const isClosedValue = monthRow[10]; // K열 (index 10)
        const isClosed = isClosedValue === true || String(isClosedValue).toUpperCase() === 'TRUE' || isClosedValue === 1 || String(isClosedValue) === '1';
        status = isClosed ? 'COMPLETED' : 'OPEN';
      }
    }

    // 통계 계산
    let totalReporters = 0;
    let totalBibleStudies = 0;
    let publisherCount = 0;
    let publisherStudies = 0;
    let rpCount = 0;
    let rpHours = 0;
    let rpStudies = 0;
    let apCount = 0;
    let apHours = 0;
    let apStudies = 0;

    rows.forEach(row => {
      const participated = String(row[2]).toUpperCase() === 'Y'; // C열: 참여
      const bibleStudies = row[3] ? Number(row[3]) : 0; // D열: 연구
      const hours = row[4] ? Number(row[4]) : 0; // E열: 시간
      const division = row[8] || ''; // I열: 구분

      if (participated) {
        totalReporters++;
        totalBibleStudies += bibleStudies;

        if (division === 'RP') {
          rpCount++;
          rpHours += hours;
          rpStudies += bibleStudies;
        } else if (division === 'AP') {
          apCount++;
          apHours += hours;
          apStudies += bibleStudies;
        } else {
          publisherCount++;
          publisherStudies += bibleStudies;
        }
      }
    });

    const stats = {
      totalReporters,
      totalBibleStudies,
      publisherCount,
      publisherStudies,
      rpCount,
      rpHours,
      rpStudies,
      apCount,
      apHours,
      apStudies,
      status
    };

    return ContentService.createTextOutput(JSON.stringify(stats))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getMonthlyStats: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 봉사연도 변경 처리 함수
function handleChangeServiceYear(newSpreadsheetId) {
  try {
    // PropertiesService를 사용하여 스프레드시트 ID 변경
    setCurrentSpreadsheetId(newSpreadsheetId);
    
    // 변경된 스프레드시트의 정보 가져오기
    const newSheet = SpreadsheetApp.openById(newSpreadsheetId);
    const newTitle = newSheet.getName();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true,
      message: '봉사연도가 변경되었습니다.',
      data: {
        title: newTitle,
        id: newSpreadsheetId
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in handleChangeServiceYear: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 봉사연도 목록 조회 함수
function getServiceYears() {
  try {
    // 하드코딩된 봉사연도 목록
    const serviceYears = [
      { year: '2026', spreadsheetId: '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y' },
      { year: '2025', spreadsheetId: '1zWrarRmDbTCssxoHqWigjeHsN1lUpOAMV43Bn_sYeg4' }
    ];
    
    // 현재 스프레드시트 ID 가져오기
    const currentSpreadsheetId = getCurrentSpreadsheetId();
    
    // 현재 스프레드시트 ID에 해당하는 연도 찾기
    const currentYearData = serviceYears.find(sy => sy.spreadsheetId === currentSpreadsheetId);
    const currentYear = currentYearData ? currentYearData.year : '2026';
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        currentYear: currentYear,
        years: serviceYears
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in getServiceYears: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 구글시트 정보 조회 함수
function getSpreadsheetInfo() {
  try {
    const currentSpreadsheetId = getCurrentSpreadsheetId();
    const sheet = SpreadsheetApp.openById(currentSpreadsheetId);
    const title = sheet.getName();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        title: title,
        id: currentSpreadsheetId
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in getSpreadsheetInfo: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 미보고자 조회 함수
function getUnreportedMembers(sheet, month, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    const groupManager = managerData.slice(4).find(row => row[2] === email);
    const managerGroup = groupManager ? groupManager[0] : null;

    // 전체명단에서 모든 사람 목록 가져오기
    const listSheet = sheet.getSheetByName('전체명단');
    const listData = listSheet.getRange('A2:F200').getValues()
      .filter(row => row[0] || row[1]); // 빈 행 제거
    
    // 해당 월 시트에서 보고한 사람들 목록 가져오기
    const monthSheet = sheet.getSheetByName(month);
    let reportedNames = [];
    if (monthSheet) {
      const dataRange = monthSheet.getRange('A9:K120');
      const rows = dataRange.getValues().filter(row => {
        return row[0] && String(row[0]).trim() !== '';
      });
      reportedNames = rows.map(row => row[0]); // A열: 이름
    }

    // 미보고자 찾기
    let unreportedMembers = [];
    for (let i = 0; i < listData.length; i++) {
      const name = listData[i][0]; // A열: 이름
      const group = listData[i][5]; // F열: 집단
      
      if (name && !reportedNames.includes(name)) {
        // 집단 관리자인 경우 해당 집단만 필터링
        if (!isSuperManager && managerGroup && group !== managerGroup) {
          continue;
        }
        
        unreportedMembers.push({
          name: name,
          group: group || ''
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(unreportedMembers))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getUnreportedMembers: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 전체 명단 조회 함수
function getAllMembers(sheet, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    const groupManager = managerData.slice(4).find(row => row[2] === email);
    const managerGroup = groupManager ? groupManager[0] : null;

    // 전체명단에서 모든 사람 목록 가져오기
    const listSheet = sheet.getSheetByName('전체명단');
    const listData = listSheet.getRange('A2:F200').getValues()
      .filter(row => row[0] || row[1]); // 빈 행 제거
    
    let allMembers = [];
    for (let i = 0; i < listData.length; i++) {
      const name = listData[i][0]; // A열: 이름
      const group = listData[i][5]; // F열: 집단
      
      if (name) {
        // 집단 관리자인 경우 해당 집단만 필터링
        if (!isSuperManager && managerGroup && group !== managerGroup) {
          continue;
        }
        
        allMembers.push({
          name: name,
          group: group || ''
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(allMembers))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getAllMembers: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 집계 데이터 조회 함수 (최적화 버전 - 범위 제한)
function getAggregateData(sheet, email) {
  try {
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const isSuperManager = managerData.slice(0, 2).some(row => row[2] === email);
    // groupManager logic potentially needed if we want to secure data per group in future
    // For now, aggregate data is summary level.

    const aggregateSheet = sheet.getSheetByName('집계');
    if (!aggregateSheet) {
      // 집계 시트가 없으면 사용자에게 알림
       return ContentService.createTextOutput(JSON.stringify({ error: '집계 시트를 찾을 수 없습니다.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 집계 시트 데이터 읽기 (최적화: 필요한 범위만 읽기 A1:K13)
    // 헤더(1행) + 12개월 데이터(2-13행)
    const dataRange = aggregateSheet.getRange('A1:K13');
    const values = dataRange.getValues();
    
    // 데이터 행들 (1행부터 데이터라고 가정, 0행은 헤더)
    const dataRows = values.slice(1);
    
    // 월 목록 (상태 확인용)
    const months = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
    
    const reports = months.map(month => {
      // 월 매칭 (A열 인덱스 0)
      const row = dataRows.find(r => r[0] === month);
      
      // 상태 확인 (각 시트의 M1 셀) -> 속도 저하 원인으로 제거
      // 상태 확인 (집계 시트 K열, index 10)
      const isClosedValue = row ? row[10] : false;
      const isClosed = isClosedValue === true || String(isClosedValue).toUpperCase() === 'TRUE' || isClosedValue === 1 || String(isClosedValue) === '1';
      const status = isClosed ? 'COMPLETED' : 'OPEN';

      if (!row) {
        return {
          month: month,
          status: status,
          stats: {}
        };
      }

      // 사용자 제공 컬럼 순서: 
      // '총 보고자 수'(B), '전도인 수'(C), '전도인 연구'(D), 
      // '보조 수'(E), '보조 시간'(F), '보조 연구'(G), 
      // '정규 수'(H), '정규 시간'(I), '정규 연구'(J)
      
      // Index in row (where row[0] is Month):
      // row[1]: 총 보고자 수
      // row[2]: 전도인 수
      // row[3]: 전도인 연구
      // row[4]: 보조 수
      // row[5]: 보조 시간
      // row[6]: 보조 연구
      // row[7]: 정규 수
      // row[8]: 정규 시간
      // row[9]: 정규 연구
      
      const pubStudies = Number(row[3] || 0);
      const apStudies = Number(row[6] || 0);
      const rpStudies = Number(row[9] || 0);
      const totalStudies = pubStudies + apStudies + rpStudies; // 총 연구 계산

      return {
        month: month,
        status: status,
        stats: {
          totalReporters: Number(row[1] || 0),
          totalBibleStudies: totalStudies, // 계산된 총 연구 수
          publisherCount: Number(row[2] || 0),
          publisherStudies: pubStudies,
          apCount: Number(row[4] || 0),
          apHours: Number(row[5] || 0),
          apStudies: apStudies,
          rpCount: Number(row[7] || 0),
          rpHours: Number(row[8] || 0),
          rpStudies: rpStudies
        }
      };
    });

    return ContentService.createTextOutput(JSON.stringify(reports))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in getAggregateData: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 초기 대시보드 데이터 통합 조회 (성능 최적화)
// 기존 3개의 API 호출을 1개로 통합: getServiceYears + getSpreadsheetInfo + checkManagerType + getAggregateData
function getInitialDashboardData(email) {
  try {
    const SPREADSHEET_ID = getCurrentSpreadsheetId();
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 1. 봉사연도 정보
    const serviceYears = [
      { year: '2026', spreadsheetId: '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y' },
      { year: '2025', spreadsheetId: '1zWrarRmDbTCssxoHqWigjeHsN1lUpOAMV43Bn_sYeg4' }
    ];
    const currentYearData = serviceYears.find(sy => sy.spreadsheetId === SPREADSHEET_ID);
    const currentYear = currentYearData ? currentYearData.year : '2026';
    
    // 2. 스프레드시트 정보
    const title = sheet.getName();
    
    // 3. 관리자 정보
    const managerSheet = sheet.getSheetByName('집단명');
    const managerData = managerSheet.getRange('A1:C20').getValues()
      .filter(row => row[0] || row[1] || row[2]); // 빈 행 제거
    const userRow = managerData.find(row => row[2] && row[2].toString().trim().toLowerCase() === email.trim().toLowerCase());
    
    let managerInfo = { type: null, groupName: null, name: null };
    if (userRow) {
      const roleOrGroup = userRow[0];
      const name = userRow[1];
      
      if (roleOrGroup === '최고관리자') {
        managerInfo = { type: 'super', name: name, groupName: null };
      } else if (roleOrGroup) {
        managerInfo = { type: 'group', groupName: roleOrGroup, name: name };
      }
    }
    
    // 4. 집계 데이터 (최적화된 범위 읽기)
    const aggregateSheet = sheet.getSheetByName('집계');
    let reports = [];
    
    if (aggregateSheet) {
      const dataRange = aggregateSheet.getRange('A1:K13');
      const values = dataRange.getValues();
      const dataRows = values.slice(1);
      const months = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
      
      reports = months.map(month => {
        const row = dataRows.find(r => r[0] === month);
        const isClosedValue = row ? row[10] : false;
        const isClosed = isClosedValue === true || String(isClosedValue).toUpperCase() === 'TRUE' || isClosedValue === 1 || String(isClosedValue) === '1';
        const status = isClosed ? 'COMPLETED' : 'OPEN';

        if (!row) {
          return { month: month, status: status, stats: {} };
        }

        const pubStudies = Number(row[3] || 0);
        const apStudies = Number(row[6] || 0);
        const rpStudies = Number(row[9] || 0);
        const totalStudies = pubStudies + apStudies + rpStudies;

        return {
          month: month,
          status: status,
          stats: {
            totalReporters: Number(row[1] || 0),
            totalBibleStudies: totalStudies,
            publisherCount: Number(row[2] || 0),
            publisherStudies: pubStudies,
            apCount: Number(row[4] || 0),
            apHours: Number(row[5] || 0),
            apStudies: apStudies,
            rpCount: Number(row[7] || 0),
            rpHours: Number(row[8] || 0),
            rpStudies: rpStudies
          }
        };
      });
    }
    
    // 모든 데이터를 하나의 응답으로 통합
    const response = {
      success: true,
      data: {
        serviceYear: {
          currentYear: currentYear,
          years: serviceYears
        },
        spreadsheet: {
          title: title,
          id: SPREADSHEET_ID
        },
        manager: managerInfo,
        reports: reports
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in getInitialDashboardData: ' + error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

