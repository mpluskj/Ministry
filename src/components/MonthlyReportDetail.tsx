import './MonthlyReportDetail.css';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  SelectChangeEvent,
  Link,
  Button,
  Menu,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { getMonthlyDetail, getUnreportedMembers, getYearlyReport } from '../services/clientService';
import YearlyReportCard from './YearlyReportCard';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

interface MonthlyReportDetailProps {
  month: string;
  managerEmail: string;
  open: boolean;
  onClose: () => void;
  serviceYear?: string; // 봉사연도 추가
}

// 백엔드에서 반환하는 데이터 구조에 맞게 인터페이스 업데이트


interface DetailRow {
  name: string;
  participated: boolean;
  bibleStudies: number | string;
  hours: number | string;
  remarks: string | string[];
  division: string; // '구분' 필드 (I열 또는 J열)
  position: string;
  group: string; // 집단 정보도 포함될 수 있음 (백엔드에서 반환)
}

interface MonthlyRecord {
  month: string;
  participated: boolean;
  bibleStudies: number | string;
  hours: number | string;
  remarks: string | string[];
  division: string;
}



export default function MonthlyReportDetail({
  month,
  managerEmail,
  open,
  onClose,
  serviceYear: propServiceYear, // props에서 serviceYear 받기
}: MonthlyReportDetailProps) {
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [filteredDetails, setFilteredDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('전체');
  const [divisionFilter, setDivisionFilter] = useState<string>('전체');
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [yearlyReportOpen, setYearlyReportOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [unreportedMembers, setUnreportedMembers] = useState<Array<{name: string, group: string}>>([]);
  const [unreportedDialogOpen, setUnreportedDialogOpen] = useState(false);
  const [serviceYear, setServiceYear] = useState<string>(propServiceYear || '');
  
  // 전도인카드 필터링을 위한 상태 변수
  const [publisherCardFilterOpen, setPublisherCardFilterOpen] = useState(false);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [divisionCardFilter, setDivisionCardFilter] = useState<string[]>([]);


  useEffect(() => {
    if (open) {
      loadDetails();
    }
  }, [open, month, managerEmail]);
  
  // propServiceYear가 변경될 때 serviceYear state 업데이트
  useEffect(() => {
    if (propServiceYear) {
      setServiceYear(propServiceYear);
    }
  }, [propServiceYear]);

  useEffect(() => {
    if (open) {
      window.history.pushState(null, '', window.location.pathname);
      const handlePopState = () => {
        if (yearlyReportOpen) {
          setYearlyReportOpen(false);
          window.history.pushState(null, '', window.location.pathname);
        } else {
          onClose();
        }
      };
      window.addEventListener('popstate', handlePopState);
      
      // 개별 전도인카드 출력 이벤트 리스너 추가
      const handleExportPublisherCardEvent = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail && customEvent.detail.name) {
          handleExportSelectedPublisherCardToPDF(customEvent.detail.name);
        }
      };
      document.addEventListener('export-publisher-card', handleExportPublisherCardEvent);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        document.removeEventListener('export-publisher-card', handleExportPublisherCardEvent);
      };
    }
  }, [open, yearlyReportOpen, onClose]);

  // 데이터가 로드되면 사용 가능한 집단과 구분 목록 추출
  useEffect(() => {
    if (details.length > 0) {
      // 집단 목록 추출
      const groups = ['전체', ...new Set(details.map(item => item.group).filter(Boolean))].sort();
      setAvailableGroups(groups);
      // 구분 목록 추출 (RP, AP 등)
      const uniqueDivisions = new Set();
      details.forEach(item => {
        if (item.division) {
          if (item.division === 'RP') {
            uniqueDivisions.add('정규');
          } else if (item.division === 'AP') {
            uniqueDivisions.add('보조');
          } else {
            uniqueDivisions.add(item.division);
          }
        } else {
          uniqueDivisions.add('전도인');
        }
      });
      const divisions = ['전체', ...Array.from(uniqueDivisions) as string[]].sort();
      setAvailableDivisions(divisions);

      // 초기 필터링 적용
      applyFilters(details, '전체', '전체');
    } else {
      setFilteredDetails([]);
    }
  }, [details]);

  // 필터 변경 시 데이터 필터링
  useEffect(() => {
    applyFilters(details, groupFilter, divisionFilter);
  }, [groupFilter, divisionFilter]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMonthlyDetail(month, managerEmail);
      setDetails(data);
    } catch (error) {
      console.error('Error loading details:', error);
      setError(error instanceof Error ? error.message : '데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 필터 적용 함수
  const applyFilters = (data: DetailRow[], group: string, division: string) => {
    let filtered = [...data];
    
    // 집단 필터 적용
    if (group !== '전체') {
      filtered = filtered.filter(item => item.group === group);
    }
    
    // 구분 필터 적용
    if (division !== '전체') {
      if (division === '전도인') {
        filtered = filtered.filter(item => !item.division);
      } else if (division === '정규') {
        filtered = filtered.filter(item => item.division === 'RP');
      } else if (division === '보조') {
        filtered = filtered.filter(item => item.division === 'AP');
      } else {
        filtered = filtered.filter(item => item.division === division);
      }
    }

    // 이름순으로 정렬
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    setFilteredDetails(filtered);
  };

  // 집단 필터 변경 핸들러
  const handleGroupFilterChange = (event: SelectChangeEvent) => {
    setGroupFilter(event.target.value);
  };

  // 구분 필터 변경 핸들러
  const handleDivisionFilterChange = (event: SelectChangeEvent) => {
    setDivisionFilter(event.target.value);
  };

  // 메뉴 핸들러
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // PDF 출력 함수 (상세보고)
  const handleExportDetailToPDF = async () => {
    handleMenuClose();
    setPdfLoading(true);
    setPdfProgress(0);

    try {
      // 테이블 요소 찾기 - 여러 선택자 시도
      let element = document.getElementById('monthly-detail-table');
      if (!element) {
        element = document.querySelector('.MuiTableContainer-root');
      }
      if (!element) {
        element = document.querySelector('table');
      }
      if (!element) {
        throw new Error('출력할 테이블을 찾을 수 없습니다. 데이터가 로드되었는지 확인해주세요.');
      }

      setPdfProgress(20);
      
      setPdfProgress(60);
      

      const pdf = new jsPDF('p', 'mm', 'a4');
      await loadAndApplyFont(pdf);
      
      // 여백 설정 - 상하좌우 여백 적용 (하단 여백 축소)
      const leftMargin = 15;
      const rightMargin = 15;
      const pdfTopMargin = 20;
      const pdfBottomMargin = 10; // 하단 여백 축소 (페이지 번호 제거로 인해)
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // 제목 추가 (텍스트로 직접 추가 - 전도인카드와 동일한 방식)
      const groupName = groupFilter === '전체' ? '춘천남부회중' : groupFilter;
      const title = `${groupName} ${month} 상세 보고`;
      
      // 제목 스타일 설정
      pdf.setFont('Gowun Dodum');
      pdf.setFontSize(18);
      pdf.text(title, pageWidth / 2, pdfTopMargin, { align: 'center' });
      
      // 제목 높이 계산 (이미지 대신 텍스트 높이 계산)
      const titleHeight = 10; // 텍스트 제목의 대략적인 높이
      
      // 테이블 이미지 크기 계산


      let position = pdfTopMargin + titleHeight + 2; // 제목 아래 여백 조정 (한 줄 띄우기)
      
      // 총계 계산
       const totals = {
         인원: filteredDetails.length,
         연구합계: filteredDetails.reduce((sum, detail) => sum + (parseInt(String(detail.bibleStudies)) || 0), 0),
         시간합계: filteredDetails.reduce((sum, detail) => sum + (parseInt(String(detail.hours)) || 0), 0),
         RP인원합계: filteredDetails.filter(detail => detail.division === 'RP').length,
         AP인원합계: filteredDetails.filter(detail => detail.division === 'AP').length,
         봉종인원합계: filteredDetails.filter(detail => detail.position === '봉사의 종' || detail.position === '봉종').length,
         장로인원합계: filteredDetails.filter(detail => detail.position === '장로').length,
         직책인원합계: filteredDetails.filter(detail => detail.position && detail.position !== '전도인').length
       };
      
      // 페이지 여백 설정



      
      // 총계 행을 테이블에 추가 - 스타일 강화
      const totalRow = document.createElement('tr');
      const headerRow = element.querySelector('tr');
      const firstTd = element.querySelector('td');
      const tbody = element.querySelector('tbody');
      
      // 기존 총계 행이 있는지 확인하고 제거
      const existingTotalRow = Array.from(element.querySelectorAll('tbody tr')).find(row => 
        row.firstElementChild && row.firstElementChild.textContent === '총계'
      );
      if (existingTotalRow && existingTotalRow.parentNode) {
        existingTotalRow.parentNode.removeChild(existingTotalRow);
      }

      if (headerRow) {
        totalRow.style.backgroundColor = '#e3f2fd';
        totalRow.style.fontWeight = 'bold';
        totalRow.style.borderTop = '2px solid #1976d2';
      }
      
      // 총계 행 데이터 설정
      const totalCells = [
        { text: '총계', align: 'center' },
        { text: totals.인원.toString(), align: 'center' },
        { text: totals.연구합계.toString(), align: 'center' },
        { text: totals.시간합계.toString(), align: 'center' },
        { text: `RP ${totals.RP인원합계}`, align: 'center' },
        { text: `AP ${totals.AP인원합계}`, align: 'center' },
        { text: `장로 ${totals.장로인원합계}`, align: 'center' },
        { text: `봉종 ${totals.봉종인원합계}`, align: 'center' }
      ];
      
      if (tbody && firstTd) {
        totalCells.forEach(cell => {
          const td = document.createElement('td');
          td.style.textAlign = cell.align;
          td.style.padding = '8px';
          td.style.borderBottom = '1px solid rgba(224, 224, 224, 1)';
          td.style.fontSize = '0.875rem';
          td.style.fontWeight = 'bold';
          td.style.color = 'black';
          td.innerText = cell.text;
          totalRow.appendChild(td);
        });
        tbody.appendChild(totalRow);
      }
      
      // Use jspdf-autotable for table generation
      const tableHeaders = Array.from(element.querySelectorAll('th')).map(th => th.innerText);
      const tableRows = Array.from(element.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText)
      );

      // 테이블 너비 계산 (페이지 너비에서 여백 제외)
      const tableWidth = pageWidth - leftMargin - rightMargin;
      
      // 각 열의 상대적 너비 비율 설정 (헤더 개수에 맞게 조정)
      const columnWidths = tableHeaders.map((header) => {
        // 비고 열은 2배로 늘리고, 나머지는 균등하게 분배
        if (header === '비고' || header.includes('비고')) {
          return 0.3; // 비고 열은 2배로 늘림
        }
        // 나머지 열은 균등하게 분배 (비고 열 제외한 나머지 공간을 균등하게)
        return (1 - 0.3) / (tableHeaders.length - 1);
      });
      
      // 열 스타일 설정 (명시적 너비 지정)
      const columnStyles: any = {};
      for (let i = 0; i < tableHeaders.length; i++) {
        columnStyles[i] = {
          cellWidth: tableWidth * columnWidths[i],
          halign: 'center' // 모든 열을 가운데 정렬
        };
      }
      
      try {
        (pdf as any).autoTable({
          head: [tableHeaders],
          body: tableRows,
          startY: position,
          margin: { left: leftMargin, right: rightMargin, bottom: pdfBottomMargin },
          styles: {
            font: 'Gowun Dodum',
            fontSize: 7, // 폰트 크기 줄임
            cellPadding: 2, // 셀 패딩 줄임
            lineColor: [224, 224, 224],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
          },
          headStyles: {
            fillColor: [23, 107, 135],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: 'Gowun Dodum',
            fontSize: 9, // 헤더 폰트 크기 더 키움
            minCellHeight: 8, // 헤더 셀 높이 더 키움
            halign: 'center', // 가운데 정렬
            valign: 'middle', // 세로 가운데 정렬
            lineWidth: 0.5 // 테두리 두께 증가
          },
          bodyStyles: {
            fillColor: [255, 255, 255]
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          columnStyles: columnStyles, // 열 스타일 적용
          // 페이지 번호 표시 제거하고 여백 확보
          didDrawPage: function () {
            // 페이지 번호 표시 제거
          }
        });
      } catch (error) {
        console.error('테이블 생성 오류:', error);
        throw new Error('테이블 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
      }
      
      setPdfProgress(90);
      
      pdf.save(`${month}_상세보고.pdf`);
      setPdfProgress(100);
      
      // 성공 메시지
      setTimeout(() => {
        alert('PDF가 성공적으로 생성되었습니다.');
      }, 500);
      
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      let errorMessage = 'PDF 생성 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        errorMessage += ` (${error.message})`;
      }
      alert(errorMessage);
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  };

  // 전도인카드 필터 다이얼로그 열기
  const handleOpenPublisherCardFilter = () => {
    // 기본적으로 모든 전도인 선택
    setSelectedPublishers(filteredDetails.map(member => member.name));
    // 기본 필터 설정 (모든 구분 포함)
    setDivisionCardFilter(['정규', '보조', '전도인']);
    setPublisherCardFilterOpen(true);
    handleMenuClose();
  };
  
  // 전도인카드 필터링 적용
  const handleApplyPublisherCardFilter = async () => {
    setPdfLoading(true);
    setPdfProgress(0);
    setPublisherCardFilterOpen(false);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // 가로 모드
      await loadAndApplyFont(pdf);
      let isFirstPage = true;
      
      // 선택된 전도인과 구분으로 필터링
      const filteredMembers = filteredDetails.filter(member => {
        // 이름으로 필터링
        if (!selectedPublishers.includes(member.name)) return false;
        
        // 구분으로 필터링
        if (divisionCardFilter.length > 0) {
          if (member.division === 'RP' && !divisionCardFilter.includes('정규')) return false;
          if (member.division === 'AP' && !divisionCardFilter.includes('보조')) return false;
          if ((!member.division || member.division === 'P') && !divisionCardFilter.includes('전도인')) return false;
        }
        
        return true;
      });
      
      const totalMembers = filteredMembers.length;
      
      for (let i = 0; i < totalMembers; i++) {
        const member = filteredMembers[i];
        setPdfProgress((i / totalMembers) * 80);
        
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;
        
        // 연간 보고 데이터 가져오기
        const yearlyData = await getYearlyReport(member.name, managerEmail);
        
        // 전도인카드 생성
      await generatePublisherCard(pdf, yearlyData, serviceYear);
      }
      
      setPdfProgress(90);
      pdf.save(`${month}_전도인카드_선택됨.pdf`);
      setPdfProgress(100);
      
      setTimeout(() => {
        alert(`${totalMembers}명의 전도인카드가 성공적으로 생성되었습니다.`);
      }, 500);
      
    } catch (error) {
      console.error('전도인카드 PDF 생성 오류:', error);
      alert('전도인카드 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  };
  
  // 전도인카드 PDF 출력 함수 - 필터 다이얼로그 열기로 변경
  const handleExportPublisherCardsToPDF = () => {
    handleOpenPublisherCardFilter();
  };
  
  // 선택된 전도인 카드만 출력하는 함수
  const handleExportSelectedPublisherCardToPDF = async (name: string) => {
    setPdfLoading(true);
    setPdfProgress(0);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // 가로 모드
      await loadAndApplyFont(pdf);
      
      setPdfProgress(20);
      
      // 연간 보고 데이터 가져오기
      const yearlyData = await getYearlyReport(name, managerEmail);
      

      

      
      setPdfProgress(60);
      
      // 전도인카드 생성
      await generatePublisherCard(pdf, yearlyData, serviceYear);
      
      setPdfProgress(90);
      pdf.save(`전도인카드_${name}_${month}.pdf`);
      setPdfProgress(100);
      
      setTimeout(() => {
        alert(`${name}님의 전도인카드가 성공적으로 생성되었습니다.`);
      }, 500);
      
    } catch (error) {
      console.error('전도인카드 PDF 생성 오류:', error);
      alert('전도인카드 PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPdfLoading(false);
      setPdfProgress(0);
    }
  };

  // 전도인카드 생성 함수
  const generatePublisherCard = async (pdf: jsPDF, yearlyData: any, currentServiceYear?: string) => {
    // 여백 설정 (하단 여백 축소)
    const margin = 15; // 좌우 여백 mm 단위
    const topMargin = 15; // 상단 여백
    const bottomMargin = 5; // 하단 여백 축소 (페이지 번호 제거로 인해)
    const pageWidth = pdf.internal.pageSize.getWidth();

    // 한글 폰트 설정 (Gowun Dodum 폰트 사용)
    // loadAndApplyFont 함수에서 이미 폰트를 설정했지만, 확실하게 하기 위해 다시 설정
    pdf.setFont('Gowun Dodum');
    pdf.setFontSize(10);

    // 제목 추가
    const title = '회중용 전도인 기록 카드';
    pdf.setFontSize(18);
    pdf.text(title, pageWidth / 2, topMargin + 5, { align: 'center' });

    // 개인 정보 섹션 추가
    const userInfo = yearlyData.userInfo || {};
    let yPos = topMargin + 20;

    pdf.setFontSize(10);
    pdf.text(`이름: ${userInfo.name || ''}`, margin, yPos);
    pdf.text(`생년월일: ${userInfo.birthDate || ''}`, pageWidth / 2, yPos);
    yPos += 7;
    pdf.text(`성별: ${userInfo.gender || ''}`, margin, yPos);
    pdf.text(`침례일자: ${userInfo.baptismDate || ''}`, pageWidth / 2, yPos);
    yPos += 7;
    pdf.text(`${userInfo.hope || ''}`, margin, yPos);
    pdf.text(`${[
      userInfo.isElder && '장로',
      userInfo.isMinisterialServant && '봉사의 종',
      userInfo.isRegularPioneer && '정규 파이오니아',
      userInfo.isSpecialPioneer && '특별 파이오니아',
      userInfo.isMissionary && '야외 선교인'
    ].filter(Boolean).join(', ')}`, pageWidth / 2, yPos);

    const infoHeight = 35; // 개인정보 섹션 높이 줄임
    const titleHeight = 15; // 제목 높이 줄임

    // 개인정보와 테이블 사이 여백 조정 - 간격 더 줄임
    yPos = topMargin + titleHeight + infoHeight - 5;
    
    // 월별 기록 테이블을 이미지로 생성 - 크기 조정
    const months = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '총계'];
    const monthlyRecords = yearlyData.monthlyRecords || [];
    let totalHours = 0;
    let totalStudies = 0;
    let totalParticipated = 0;

    months.forEach(month => {
      if (month === '총계') {
        // Calculate totals for the summary row
        totalHours = monthlyRecords.reduce((sum: number, record: MonthlyRecord) => sum + (record.hours && typeof record.hours === 'number' ? record.hours : 0), 0);
        totalStudies = monthlyRecords.reduce((sum: number, record: MonthlyRecord) => sum + (record.bibleStudies && typeof record.bibleStudies === 'number' ? record.bibleStudies : 0), 0);
      } else {
        const record = monthlyRecords.find((r: any) => r.month === month) || {};
        if (record.participated) totalParticipated++;
      }
    });



    // Use jspdf-autotable for the monthly records table
    // 봉사연도 값을 가져와서 표시 (yearlyData.serviceYear가 없으면 전달받은 currentServiceYear 사용)
    const serviceYearDisplay = yearlyData.serviceYear || currentServiceYear || '봉사연도';
    const tableHeaders = [serviceYearDisplay, '참여', '성서연구', '보조 파이오니아', '시간', '비고'];
    const tableRows = months.map(month => {
      if (month === '총계') {
        return [
          '합계',
          '',
          totalStudies > 0 ? totalStudies.toString() : '',
          '',
          totalHours > 0 ? totalHours.toString() : '',
          monthlyRecords.reduce((sum: number, record: MonthlyRecord) => {
            const remarksString = String(record.remarks || ''); // Ensure remarks is a string
            const matches = remarksString.match(/: (\d+)시간/g);
            if (!matches) return sum;
            return sum + matches.reduce((hoursSum, match) => {
              const matchResult = match.match(/\d+/);
              if (!matchResult) return hoursSum;
              const hours = parseInt(matchResult[0]);
              return hoursSum + (isNaN(hours) ? 0 : hours);
            }, 0);
          }, 0) || ''
        ];
      } else {
        const record = monthlyRecords.find((r: any) => r.month === month) || {};
        return [
          record.month,
          record.participated ? 'Y' : '', // 유니코드 체크 표시 사용
          typeof record.bibleStudies === 'number' && record.bibleStudies > 0 ? record.bibleStudies : '',
          record.division === 'AP' ? 'Y' : '', // 유니코드 체크 표시 사용
          typeof record.hours === 'number' && record.hours > 0 ? record.hours : '',
          record.remarks || ''
        ];
      }
    });

    // 테이블 너비 계산 (페이지 너비에서 여백 제외)
    const tableWidth = pageWidth - (margin * 2);
    // 각 열의 상대적 너비 비율 설정 - 가독성 향상을 위해 조정
    const columnWidths = [0.12, 0.08, 0.12, 0.15, 0.12, 0.41]; // 비율 합은 1.0이어야 함
    
    // 열 스타일 설정 (명시적 너비 지정)
    const columnStyles: any = {};
    for (let i = 0; i < tableHeaders.length; i++) {
      columnStyles[i] = {
        cellWidth: tableWidth * columnWidths[i],
        halign: i === 0 ? 'left' : 'center' // 첫 번째 열은 왼쪽 정렬, 나머지는 가운데 정렬
      };
    }
    
    try {
      (pdf as any).autoTable({
        head: [tableHeaders],
        body: tableRows,
        startY: topMargin + titleHeight + infoHeight - 10, // 개인정보와 테이블 사이 여백 더 줄임
        margin: { left: margin, right: margin, bottom: bottomMargin }, // 하단 여백 설정 추가
        styles: {
          font: 'Gowun Dodum',
          fontSize: 8, // 폰트 크기 약간 키움
          cellPadding: 3, // 셀 패딩 조정
          lineColor: [80, 80, 80], // 테두리 색상 진하게
          lineWidth: 0.2, // 테두리 두께 증가
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [23, 107, 135],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'Gowun Dodum',
          fontSize: 10, // 헤더 폰트 크기 더 키움
          minCellHeight: 10, // 헤더 셀 높이 더 키움
          halign: 'center', // 가운데 정렬
          valign: 'middle', // 세로 가운데 정렬
          lineWidth: 0.5 // 테두리 두께 증가
        },
        bodyStyles: {
          fillColor: [255, 255, 255]
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240] // 대비 약간 강화
        },
        columnStyles: columnStyles, // 열 스타일 적용
        // 페이지 번호 표시 제거하고 여백 확보
        didDrawPage: function () {
          // 페이지 번호 표시 제거
        }
      });
    } catch (error) {
      console.error('테이블 생성 오류:', error);
      throw new Error('테이블 생성 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 미보고자 확인 함수
  const loadAndApplyFont = async (pdf: jsPDF) => {
    try {
      // 한글 폰트 로딩 시도
      try {
        // 폰트 파일 직접 로드 (상대 경로 사용)
        const fontResponse = await fetch('/Ministry/GowunDodum-Regular.ttf');
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
        (pdf as any).setFontSize(10);
        (pdf as any).setTextColor(0, 0, 0);
        console.log('한글 폰트 로딩 성공: Gowun Dodum');
      } catch (fontError) {
        console.error('한글 폰트 로딩 실패:', fontError);
        throw fontError; // 상위 catch 블록으로 전달
      }
    } catch (error) {
      console.error('폰트 로딩 오류:', error);
      // 폰트 로딩 실패 시 기본 폰트로 대체
      pdf.setFont('helvetica');
      console.log('기본 폰트 사용: helvetica');
    }
  };

  const handleCheckUnreported = async () => {
    handleMenuClose();
    try {
      const unreported = await getUnreportedMembers(month, managerEmail);
      setUnreportedMembers(unreported);
      setUnreportedDialogOpen(true);
    } catch (error) {
      console.error('미보고자 조회 오류:', error);
      alert('미보고자 조회 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          color: 'text.primary'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#e3f2fd', 
        color: 'black',
        fontWeight: 'bold',
        fontSize: '1.5rem',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconButton 
              onClick={handleMenuClick}
              size="small" 
              sx={{ 
                color: 'primary.main',
                bgcolor: 'white',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <MenuIcon />
            </IconButton>
            {month} 상세 보고
          </div>
          <IconButton onClick={onClose} size="small" sx={{ color: 'grey.500' }}>
            <CloseIcon />
          </IconButton>
        </div>
        
        {/* PDF 로딩 상태 */}
        {pdfLoading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              PDF 생성 중... {Math.round(pdfProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={pdfProgress} />
          </Box>
        )}
      </DialogTitle>
      
      {/* 메뉴 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <MenuItem onClick={handleExportDetailToPDF} disabled={pdfLoading}>
          <PictureAsPdfIcon sx={{ mr: 1 }} />
          출력 (상세보고)
        </MenuItem>
        <MenuItem onClick={handleExportPublisherCardsToPDF} disabled={pdfLoading || filteredDetails.length === 0}>
          <PictureAsPdfIcon sx={{ mr: 1 }} />
          전도인카드 출력
        </MenuItem>
        <MenuItem onClick={handleCheckUnreported}>
          <ReportProblemIcon sx={{ mr: 1 }} />
          미보고
        </MenuItem>
      </Menu>
      <DialogContent sx={{ 
        bgcolor: 'background.paper',
        color: 'text.primary',
        p: 3
      }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '200px'
          }}>
            <div className="loading-spinner" />
            <Typography sx={{ 
              color: 'text.primary',
              mt: 2,
              animation: 'pulse 1.5s infinite'
            }}>
              데이터를 불러오는 중입니다...
            </Typography>
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : details.length === 0 ? (
          <>
            <Typography sx={{ mb: 2, color: 'text.primary' }}>데이터가 없습니다.</Typography>
            <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(224, 224, 224, 0.3)' }, '& .MuiTableRow-root': { transition: 'background-color 0.2s ease' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>이름</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>참여</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>연구</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>시간</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>비고</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>구분</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>직책</TableCell>
                    <TableCell align="center" sx={{ color: 'text.primary', fontWeight: 'bold', bgcolor: 'action.selected' }}>집단</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* 데이터가 없을 때는 빈 테이블 본문 표시 */}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 3, 
              alignItems: 'center', 
              flexWrap: 'wrap',
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <FormControl size="small" sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
                    }
                  }
                }
              }}>
                <InputLabel id="group-filter-label" sx={{ 
                  color: '#1976d2',
                  fontWeight: 'bold',
                  mb: 1
                }}>집단</InputLabel>
                <Select
                  labelId="group-filter-label"
                  value={groupFilter}
                  label="집단"
                  onChange={handleGroupFilterChange}
                  sx={{ 
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  {availableGroups.map((group) => (
                    <MenuItem key={group} value={group} sx={{ 
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.08)'
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(25, 118, 210, 0.12)'
                      }
                    }}>
                      {group}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
                    }
                  }
                }
              }}>
                <InputLabel id="division-filter-label" sx={{ 
                  color: '#1976d2',
                  fontWeight: 'bold',
                  mb: 1
                }}>구분</InputLabel>
                <Select
                  labelId="division-filter-label"
                  value={divisionFilter}
                  label="구분"
                  onChange={handleDivisionFilterChange}
                  sx={{ 
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  {availableDivisions.map((division) => (
                    <MenuItem key={division} value={division} sx={{ 
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'rgba(25, 118, 210, 0.08)'
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(25, 118, 210, 0.12)'
                      }
                    }}>
                      {division}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {(groupFilter !== '전체' || divisionFilter !== '전체') && (
                <IconButton 
                  size="small" 
                  onClick={() => {
                    setGroupFilter('전체');
                    setDivisionFilter('전체');
                  }}
                  title="필터 초기화"
                  sx={{ ml: 1, color: 'text.primary' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              
              <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                총 {filteredDetails.length}개 항목 표시 중
                {(groupFilter !== '전체' || divisionFilter !== '전체') && 
                  ` (전체 ${details.length}개 중)`}
              </Typography>
            </Box>
            <TableContainer 
              id="monthly-detail-table"
              component={Paper} 
              sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'auto',
                '@media (max-width: 600px)': {
                  '& table': {
                    minWidth: 800
                  }
                }
              }}
            >
              <Table 
                size="small" 
                sx={{ 
                  '& .MuiTableCell-root': { 
                    borderColor: 'rgba(224, 224, 224, 0.3)',
                    py: 1.5,
                    px: 2
                  }, 
                  '& .MuiTableRow-root': { 
                    transition: 'background-color 0.2s ease'
                  }
                }}
              >
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>이름</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>참여</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>연구</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>시간</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>비고</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>구분</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>직책</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold' }}>집단</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDetails.map((row, index) => (
                    <TableRow 
                      key={index} 
                      sx={{ 
                        '&:nth-of-type(odd)': { 
                          bgcolor: 'rgba(25, 118, 210, 0.04)'
                        },
                        '&:hover': { 
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          '& .MuiTableCell-root': {
                            color: '#1976d2'
                          }
                        }
                      }}
                    >
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>
                      <Link
                        component="button"
                        onClick={() => {
                          setSelectedName(row.name);
                          setYearlyReportOpen(true);
                        }}
                        sx={{ 
                          cursor: 'pointer',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>{row.participated ? 'Y' : 'N'}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>{row.bibleStudies && row.bibleStudies !== 0 ? row.bibleStudies : ''}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>{row.hours && row.hours !== 0 ? row.hours : ''}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>{Array.isArray(row.remarks) ? row.remarks.join('\n') : (row.remarks !== null && row.remarks !== undefined) ? row.remarks : ''}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 0.5)', color: 'text.primary' }}>
                      {row.division || ''}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.2)', color: 'text.primary' }}>{row.position || ''}</TableCell>
                    <TableCell align="center" sx={{ color: 'text.primary' }}>{row.group || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </>
        )}
      </DialogContent>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'flex-end',
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        bgcolor: '#f5f5f5'
      }}>
              <Button
                onClick={onClose}
                variant="contained"
                sx={{
                  bgcolor: '#e0e0e0',
                  color: 'black',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:hover': {
                    bgcolor: '#757575',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }
                }}
              >
                닫기
              </Button>
      </Box>
      {selectedName && (
        <YearlyReportCard
          name={selectedName}
          managerEmail={managerEmail}
          open={yearlyReportOpen}
          onClose={() => setYearlyReportOpen(false)}
        />
      )}
      
      {/* 미보고자 다이얼로그 */}
      <Dialog 
        open={unreportedDialogOpen} 
        onClose={() => setUnreportedDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#ffebee', color: 'error.main' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            미보고자 목록 ({month})
            <IconButton 
              onClick={() => setUnreportedDialogOpen(false)} 
              size="small" 
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {unreportedMembers.length === 0 ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              모든 전도인이 봉사보고를 제출했습니다!
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                총 {unreportedMembers.length}명이 봉사보고를 제출하지 않았습니다.
              </Typography>
              <List>
                {unreportedMembers.map((member, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={member.name}
                      secondary={`집단: ${member.group || '미지정'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* 전도인카드 필터 다이얼로그 */}
      <Dialog
        open={publisherCardFilterOpen}
        onClose={() => setPublisherCardFilterOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#e3f2fd', color: 'primary.main' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            전도인카드 출력 설정
            <IconButton
              onClick={() => setPublisherCardFilterOpen(false)}
              size="small"
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            구분 선택
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {['정규', '보조', '전도인'].map((division) => (
              <Chip
                key={division}
                label={division}
                color={divisionCardFilter.includes(division) ? 'primary' : 'default'}
                onClick={() => {
                  if (divisionCardFilter.includes(division)) {
                    setDivisionCardFilter(divisionCardFilter.filter(d => d !== division));
                  } else {
                    setDivisionCardFilter([...divisionCardFilter, division]);
                  }
                }}
                sx={{ m: 0.5 }}
              />
            ))}
          </Box>
          
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 2, fontWeight: 'bold' }}>
            전도인 선택 ({selectedPublishers.length}명 선택됨)
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedPublishers(filteredDetails.map(member => member.name))}
            >
              모두 선택
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedPublishers([])}
              color="error"
            >
              모두 해제
            </Button>
          </Box>
          
          <Box sx={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
            <List dense>
              {filteredDetails.map((member) => (
                <ListItem key={member.name} disablePadding>
                  <ListItemButton
                    dense
                    onClick={() => {
                      if (selectedPublishers.includes(member.name)) {
                        setSelectedPublishers(selectedPublishers.filter(name => name !== member.name));
                      } else {
                        setSelectedPublishers([...selectedPublishers, member.name]);
                      }
                    }}
                  >
                    <Checkbox
                      edge="start"
                      checked={selectedPublishers.includes(member.name)}
                      tabIndex={-1}
                      disableRipple
                    />
                    <ListItemText 
                      primary={member.name} 
                      secondary={`${member.group || ''} ${member.division || '전도인'}`} 
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Button onClick={() => setPublisherCardFilterOpen(false)} color="inherit">
            취소
          </Button>
          <Button 
            onClick={handleApplyPublisherCardFilter} 
            variant="contained" 
            color="primary"
            disabled={selectedPublishers.length === 0}
          >
            선택한 전도인카드 출력 ({selectedPublishers.length}명)
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}