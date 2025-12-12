import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface MonthlyRecord {
  month: string;
  participated: boolean;
  bibleStudies: number | string;
  hours: number | string;
  remarks: string | string[];
  division: string;
}

export interface UserInfo {
  name?: string;
  birthDate?: string;
  gender?: string;
  baptismDate?: string;
  hope?: string;
  isElder?: boolean;
  isMinisterialServant?: boolean;
  isRegularPioneer?: boolean;
  isSpecialPioneer?: boolean;
  isMissionary?: boolean;
}

export interface YearlyReportData {
  userInfo: UserInfo;
  monthlyRecords: MonthlyRecord[];
  serviceYear?: string;
}

export interface DetailRow {
  name: string;
  participated: boolean;
  bibleStudies: number | string;
  hours: number | string;
  remarks: string | string[];
  division: string;
  position: string;
  group: string;
}

// 미보고자 확인 함수 (폰트 로딩)
export const loadAndApplyFont = async (pdf: jsPDF) => {
  try {
    // 한글 폰트 로딩 시도
    try {
      // 폰트 파일 직접 로드 (상대 경로 사용)
      const fontResponse = await fetch(`${import.meta.env.BASE_URL}GowunDodum-Regular.ttf`);
      if (!fontResponse.ok) {
        throw new Error(`Font fetch failed with status: ${fontResponse.status}`);
      }

      // 폰트 파일을 ArrayBuffer로 변환
      const fontBuffer = await fontResponse.arrayBuffer();

      // 작은 청크로 나누어 Base64 인코딩 (Maximum call stack size exceeded 오류 방지)
      const CHUNK_SIZE = 1024;
      let binary = '';
      const bytes = new Uint8Array(fontBuffer);
      const len = bytes.byteLength;

      for (let i = 0; i < len; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, Math.min(i + CHUNK_SIZE, len));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }

      const fontBase64 = btoa(binary);

      // 폰트를 PDF의 VFS에 추가하고 등록
      pdf.addFileToVFS('GowunDodum-Regular.ttf', fontBase64);
      pdf.addFont('GowunDodum-Regular.ttf', 'Gowun Dodum', 'normal');
      pdf.addFont('GowunDodum-Regular.ttf', 'Gowun Dodum', 'bold'); // 볼드 폰트도 추가
      pdf.setFont('Gowun Dodum');
      // 폰트 설정 강화
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);

    } catch (fontError) {
      console.error('한글 폰트 로딩 실패:', fontError);
      throw fontError; // 상위 catch 블록으로 전달
    }
  } catch (error) {
    console.error('폰트 로딩 오류:', error);
    // 폰트 로딩 실패 시 기본 폰트로 대체
    pdf.setFont('helvetica');

  }
};

export const generateMonthlyReportPDF = async (
  details: DetailRow[],
  month: string,
  groupFilter: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  await loadAndApplyFont(pdf);

  // 여백 설정
  const leftMargin = 15;
  const rightMargin = 15;
  const pdfTopMargin = 20;
  const pdfBottomMargin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();

  // 제목 추가
  const groupName = groupFilter === '전체' ? '춘천남부회중' : groupFilter;
  const title = `${groupName} ${month} 상세 보고`;

  // 제목 스타일 설정
  pdf.setFont('Gowun Dodum');
  pdf.setFontSize(18);
  pdf.text(title, pageWidth / 2, pdfTopMargin, { align: 'center' });

  const position = pdfTopMargin + 10 + 2; // 제목 아래 여백

  // 총계 계산
  const totals = {
    인원: details.length,
    연구합계: details.reduce((sum, detail) => sum + (parseInt(String(detail.bibleStudies)) || 0), 0),
    시간합계: details.reduce((sum, detail) => sum + (parseInt(String(detail.hours)) || 0), 0),
    RP인원합계: details.filter(detail => detail.division === 'RP').length,
    AP인원합계: details.filter(detail => detail.division === 'AP').length,
    봉종인원합계: details.filter(detail => detail.position === '봉사의 종' || detail.position === '봉종').length,
    장로인원합계: details.filter(detail => detail.position === '장로').length,
    직책인원합계: details.filter(detail => detail.position && detail.position !== '전도인').length
  };

  // 테이블 데이터 준비
  const tableHeaders = ['이름', '참여', '연구', '시간', '비고', '구분', '직책', '집단'];
  const tableRows = details.map(row => [
    row.name,
    row.participated ? 'Y' : 'N',
    (row.bibleStudies && row.bibleStudies !== 0) ? String(row.bibleStudies) : '',
    (row.hours && row.hours !== 0) ? String(row.hours) : '',
    Array.isArray(row.remarks) ? row.remarks.join('\n') : (row.remarks || ''),
    row.division || '',
    row.position || '',
    row.group || ''
  ]);

  // 총계 행 추가
  const totalRow = [
    '총계',
    totals.인원.toString(),
    totals.연구합계.toString(),
    totals.시간합계.toString(),
    `RP ${totals.RP인원합계}`,
    `AP ${totals.AP인원합계}`,
    `장로 ${totals.장로인원합계}`,
    `봉종 ${totals.봉종인원합계}`
  ];
  
  // 총계 행을 마지막에 추가하지 않고 autoTable의 foot으로 처리하거나 body 마지막에 추가
  // 여기서는 body 마지막에 추가하고 스타일링은 didParseCell 등에서 처리
  tableRows.push(totalRow);

  // 테이블 너비 및 열 비율
  const tableWidth = pageWidth - leftMargin - rightMargin;
  const columnWidths = [
    0.1, // 이름
    0.05, // 참여
    0.05, // 연구
    0.05, // 시간
    0.3, // 비고 (넓게)
    0.1, // 구분
    0.15, // 직책
    0.2  // 집단
  ];

  const columnStyles: Record<number, { cellWidth: number; halign: 'center' | 'left' | 'right' | 'justify' }> = {};
  tableHeaders.forEach((_, i) => {
    columnStyles[i] = {
      cellWidth: tableWidth * columnWidths[i],
      halign: 'center'
    };
  });

  try {
    (pdf as any).autoTable({
      head: [tableHeaders],
      body: tableRows,
      startY: position,
      margin: { left: leftMargin, right: rightMargin, bottom: pdfBottomMargin },
      styles: {
        font: 'Gowun Dodum',
        fontSize: 7,
        cellPadding: 2,
        lineColor: [224, 224, 224],
        lineWidth: 0.1,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [23, 107, 135],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        font: 'Gowun Dodum',
        fontSize: 9,
        minCellHeight: 8,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.5
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: columnStyles,
      didParseCell: function(data: any) {
        // 총계 행 스타일링
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fillColor = [227, 242, 253]; // #e3f2fd
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          // 상단 테두리 강조는 jspdf-autotable에서 직접 지원하지 않으므로 배경색 등으로 구분
        }
      },
      didDrawPage: function () {
        // 페이지 번호 제거
      }
    });

    pdf.save(`${month}_상세보고.pdf`);
  } catch (error) {
    console.error('테이블 생성 오류:', error);
    throw new Error('테이블 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
  }
};





