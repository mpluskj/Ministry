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
  Chip,
  Checkbox,
  ListItemButton,
  Divider,

} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import FilterListIcon from '@mui/icons-material/FilterList';
import { getMonthlyDetail, getUnreportedMembers, getYearlyReport } from '../services/clientService';
import { loadAndApplyFont, generateMonthlyReportPDF, DetailRow } from '../utils/pdfGenerator';
import { generatePublisherCard as generateS21Card, mergePDFs } from '../utils/pdfTemplateOverlay';
import YearlyReportCard from './YearlyReportCard';

interface MonthlyReportDetailProps {
  month: string;
  managerEmail: string;
  open: boolean;
  onClose: () => void;
  serviceYear?: string; // 봉사연도 추가
}





export default function MonthlyReportDetail({
  month,
  managerEmail,
  open,
  onClose,
  serviceYear: propServiceYear, // props에서 serviceYear 받기
}: MonthlyReportDetailProps) {
  const [details, setDetails] = useState<DetailRow[]>([]);

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
  const [unreportedMembers, setUnreportedMembers] = useState<Array<{ name: string, group: string }>>([]);
  const [unreportedDialogOpen, setUnreportedDialogOpen] = useState(false);
  const [serviceYear, setServiceYear] = useState<string>(propServiceYear || '');

  // 전도인카드 필터링을 위한 상태 변수
  const [publisherCardFilterOpen, setPublisherCardFilterOpen] = useState(false);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [divisionCardFilter, setDivisionCardFilter] = useState<string[]>([]);

  const filteredDetails = React.useMemo(() => {
    let filtered = [...details];

    // 집단 필터 적용
    if (groupFilter !== '전체') {
      filtered = filtered.filter(item => item.group === groupFilter);
    }

    // 구분 필터 적용
    if (divisionFilter !== '전체') {
      if (divisionFilter === '전도인') {
        filtered = filtered.filter(item => !item.division);
      } else if (divisionFilter === '정규') {
        filtered = filtered.filter(item => item.division === 'RP');
      } else if (divisionFilter === '보조') {
        filtered = filtered.filter(item => item.division === 'AP');
      } else {
        filtered = filtered.filter(item => item.division === divisionFilter);
      }
    }

    // 이름순으로 정렬
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [details, groupFilter, divisionFilter]);

  // PDF 좌표 조정 도구

  const loadDetails = React.useCallback(async () => {
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
  }, [month, managerEmail]);


  // 선택된 전도인 카드만 출력하는 함수
  const handleExportSelectedPublisherCardToPDF = React.useCallback(async (name: string) => {
    setPdfLoading(true);
    setPdfProgress(0);

    try {
      setPdfProgress(20);

      // 연간 보고 데이터 가져오기
      const yearlyData = await getYearlyReport(name, managerEmail);

      setPdfProgress(60);

      // 전도인카드 생성 (S-21 오버레이 사용)
      const pdfBytes = await generateS21Card(yearlyData, serviceYear);

      setPdfProgress(90);
      
      // PDF 다운로드
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `전도인카드_${name}_${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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
  }, [month, managerEmail, serviceYear]);

  useEffect(() => {
    if (open) {
      loadDetails();
    }
  }, [open, month, managerEmail, loadDetails]);

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
  }, [open, yearlyReportOpen, onClose, handleExportSelectedPublisherCardToPDF]);

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
    }
  }, [details]);







  // 집단 필터 변경 핸들러
  const handleGroupFilterChange = React.useCallback((event: SelectChangeEvent) => {
    setGroupFilter(event.target.value);
  }, []);

  // 구분 필터 변경 핸들러
  const handleDivisionFilterChange = React.useCallback((event: SelectChangeEvent) => {
    setDivisionFilter(event.target.value);
  }, []);

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
      setPdfProgress(20);

      // 데이터가 있는지 확인
      if (filteredDetails.length === 0) {
        throw new Error('출력할 데이터가 없습니다.');
      }

      setPdfProgress(50);

      // PDF 생성 함수 호출
      await generateMonthlyReportPDF(filteredDetails, month, groupFilter);

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
      const pdfBytesArray: Uint8Array[] = [];

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

        // 연간 보고 데이터 가져오기
        const yearlyData = await getYearlyReport(member.name, managerEmail);

        // 전도인카드 생성 (S-21 오버레이)
        const pdfBytes = await generateS21Card(yearlyData, serviceYear);
        pdfBytesArray.push(pdfBytes);
      }

      setPdfProgress(90);
      
      // PDF 병합
      const mergedPdfBytes = await mergePDFs(pdfBytesArray);

      // 다운로드
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${month}_전도인카드_선택됨.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
          color: 'text.primary',
          borderRadius: 3
        }
      }}
    >
      <DialogTitle sx={{
        bgcolor: '#ffffff',
        color: '#1a237e',
        fontWeight: 'bold',
        fontSize: '1.5rem',
        borderBottom: '1px solid #e0e0e0',
        py: 2
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconButton
              onClick={handleMenuClick}
              size="small"
              sx={{
                color: 'primary.main',
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <MenuIcon />
            </IconButton>
            {month} 상세 보고
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary', fontWeight: 'normal' }}>
              (총 {filteredDetails.length}명)
            </Typography>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconButton onClick={onClose} size="small" sx={{ color: 'grey.500' }}>
              <CloseIcon />
            </IconButton>
          </div>
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            maxHeight: 500,
            width: 250
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

        <Divider />
        
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 'bold' }}>
            필터 설정
          </Typography>
          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel id="menu-group-filter-label">집단</InputLabel>
            <Select
              labelId="menu-group-filter-label"
              value={groupFilter}
              label="집단"
              onChange={handleGroupFilterChange}
              onClick={(e) => e.stopPropagation()}
            >
              {availableGroups.map((group) => (
                <MenuItem key={group} value={group}>{group}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" fullWidth>
            <InputLabel id="menu-division-filter-label">구분</InputLabel>
            <Select
              labelId="menu-division-filter-label"
              value={divisionFilter}
              label="구분"
              onChange={handleDivisionFilterChange}
              onClick={(e) => e.stopPropagation()}
            >
              {availableDivisions.map((division) => (
                <MenuItem key={division} value={division}>{division}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Menu>
      <DialogContent sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        p: 1
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
                  <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #eeeeee' }}>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>이름</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>참여</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>연구</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>시간</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>비고</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>구분</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>직책</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold' }}>집단</TableCell>
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
            <TableContainer
              id="monthly-detail-table"
              component={Paper}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                overflow: 'auto',
                borderRadius: 2,
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
                  <TableRow sx={{ bgcolor: '#fafafa', borderBottom: '2px solid #eeeeee' }}>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>이름</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>참여</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>연구</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>시간</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>비고</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>구분</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold', borderRight: '1px solid #eeeeee' }}>직책</TableCell>
                    <TableCell align="center" sx={{ color: '#455a64', fontWeight: 'bold' }}>집단</TableCell>
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