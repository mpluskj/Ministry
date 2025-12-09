import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress,
  Container,
} from '@mui/material';
import MonthlyReportDetail from './MonthlyReportDetail';
import { getInitialDashboardData, toggleMonthStatus, changeServiceYear } from '../services/clientService';

interface MonthlyStats {
  totalReporters: number;
  totalBibleStudies: number;
  publisherCount: number;
  publisherStudies: number;
  rpCount: number;
  rpHours: number;
  rpStudies: number;
  apCount: number;
  apHours: number;
  apStudies: number;
}

interface ManagerDashboardProps {
  email: string;
  onLogout: () => void;
}

export default function ManagerDashboard({ email, onLogout }: ManagerDashboardProps) {
  const [reports, setReports] = useState<Array<{
    month: string;
    status: string;
    stats: MonthlyStats;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMonth, setConfirmMonth] = useState<string | null>(null);
  const [managerType, setManagerType] = useState<'group' | 'super' | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [managerName, setManagerName] = useState<string | null>(null);
  const [sheetTitle, setSheetTitle] = useState<string>('');
  const [serviceYear, setServiceYear] = useState<string>('');
  const [serviceYears, setServiceYears] = useState<Array<{ year: string; spreadsheetId: string }>>([]);
  const [yearMenuAnchor, setYearMenuAnchor] = useState<null | HTMLElement>(null);



  useEffect(() => {
    const init = async () => {
      try {
        // 최적화: 3개의 API 호출을 1개로 통합
        const dashboardData = await getInitialDashboardData(email);

        // 모든 상태를 한 번에 업데이트 (리렌더링 최소화)
        setServiceYear(dashboardData.serviceYear.currentYear);
        setServiceYears(dashboardData.serviceYear.years);
        setSheetTitle(dashboardData.spreadsheet.title);
        setManagerType(dashboardData.manager.type);
        setGroupName(dashboardData.manager.groupName);
        setManagerName(dashboardData.manager.name);
        setReports(Array.isArray(dashboardData.reports) ? dashboardData.reports : []);

      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [email]);



  const handleYearClick = (event: React.MouseEvent<HTMLElement>) => {
    setYearMenuAnchor(event.currentTarget);
  };

  const handleYearClose = () => {
    setYearMenuAnchor(null);
  };

  const handleYearSelect = async (year: string, spreadsheetId: string) => {
    try {
      setLoading(true); // 로딩 상태 시작
      handleYearClose(); // 메뉴 먼저 닫기

      // 봉사연도 변경
      await changeServiceYear(spreadsheetId);

      // 변경된 스프레드시트의 모든 데이터 다시 로드 (최적화된 API 사용)
      const dashboardData = await getInitialDashboardData(email);

      // 모든 상태 업데이트
      setServiceYear(dashboardData.serviceYear.currentYear);
      setServiceYears(dashboardData.serviceYear.years);
      setSheetTitle(dashboardData.spreadsheet.title);
      setManagerType(dashboardData.manager.type);
      setGroupName(dashboardData.manager.groupName);
      setManagerName(dashboardData.manager.name);
      setReports(Array.isArray(dashboardData.reports) ? dashboardData.reports : []);

    } catch (error) {
      console.error('Error changing service year:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // 최적화: 단일 API 호출로 모든 데이터 가져오기
      const dashboardData = await getInitialDashboardData(email);

      // 모든 상태 업데이트
      setServiceYear(dashboardData.serviceYear.currentYear);
      setServiceYears(dashboardData.serviceYear.years);
      setSheetTitle(dashboardData.spreadsheet.title);
      setManagerType(dashboardData.manager.type);
      setGroupName(dashboardData.manager.groupName);
      setManagerName(dashboardData.manager.name);
      setReports(Array.isArray(dashboardData.reports) ? dashboardData.reports : []);

    } catch (error) {
      console.error('Error loading data:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (month: string, currentStatus: string) => {
    if (currentStatus === 'COMPLETED') {
      setConfirmMonth(month);
      setConfirmOpen(true);
      return;
    }

    // 낙관적 업데이트: 즉시 UI 업데이트 (빠른 반응)
    const newStatus = currentStatus === 'COMPLETED' ? 'OPEN' : 'COMPLETED';
    const previousReports = [...reports];

    setReports(reports.map(r =>
      r.month === month
        ? { ...r, status: newStatus }
        : r
    ));

    try {
      await toggleMonthStatus(month, currentStatus);
      // 성공 시 서버와 동기화됨 - 추가 로드 불필요
    } catch (error) {
      console.error('Error toggling status:', error);
      // 실패 시 이전 상태로 롤백
      setReports(previousReports);
      alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmMonth) return;

    // 낙관적 업데이트: 즉시 UI 업데이트
    const previousReports = [...reports];

    setReports(reports.map(r =>
      r.month === confirmMonth
        ? { ...r, status: 'OPEN' }
        : r
    ));

    setConfirmOpen(false);
    setConfirmMonth(null);

    try {
      await toggleMonthStatus(confirmMonth, 'COMPLETED');
      // 성공 시 서버와 동기화됨
    } catch (error) {
      console.error('Error toggling status:', error);
      // 실패 시 이전 상태로 롤백
      setReports(previousReports);
      alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="primary">
          로딩 중...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{
      py: 3,
      position: 'relative',
      minHeight: '100vh',
      px: { xs: 1, sm: 2, md: 3 },
      overflowX: 'auto'
    }}>
      {/* 제목 영역 */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 1,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {sheetTitle}
        </Typography>
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: 'text.secondary',
            fontWeight: 500
          }}
        >
          {groupName ? `${groupName} 봉사 집단` : '전체 회중'} - {managerName} {managerType === 'super' ? '총관리자' : '관리자'}
        </Typography>
      </Box>

      <Box sx={{
        overflowX: 'auto',
        width: '100%',
        '&::-webkit-scrollbar': {
          height: '8px'
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: '4px'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#c1c1c1',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#a8a8a8'
          }
        }
      }}>
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: 2,
            minWidth: '800px'
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                <TableCell
                  align="center"
                  sx={{
                    borderRight: '1px solid rgba(0, 0, 0, 0.3)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    backgroundColor: '#bbdefb',
                    '&:hover': { backgroundColor: '#90caf9' }
                  }}
                  onClick={handleYearClick}
                >
                  {serviceYear}
                </TableCell>
                <Menu
                  anchorEl={yearMenuAnchor}
                  open={Boolean(yearMenuAnchor)}
                  onClose={handleYearClose}
                >
                  {serviceYears.map((yearOption) => (
                    <MenuItem
                      key={yearOption.year}
                      onClick={() => handleYearSelect(yearOption.year, yearOption.spreadsheetId)}
                      selected={yearOption.year === serviceYear}
                    >
                      {yearOption.year}
                    </MenuItem>
                  ))}
                </Menu>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>보고자 수</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>전도인 수</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>전도인 연구</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>보조 수</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>보조 시간</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>보조 연구</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>정규 수</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>정규 시간</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)', fontWeight: 'bold', fontSize: '0.9rem' }}>정규 연구</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(reports) && reports.map((report) => (
                <TableRow
                  key={report.month}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#f0f8ff' },
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{
                      borderRight: '1px solid rgba(0, 0, 0, 0.3)',
                      fontWeight: 'bold',
                      color: 'primary.main'
                    }}
                  >
                    {report.month}
                  </TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.totalReporters && report.stats.totalReporters !== 0 ? report.stats.totalReporters : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.publisherCount && report.stats.publisherCount !== 0 ? report.stats.publisherCount : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.publisherStudies && report.stats.publisherStudies !== 0 ? report.stats.publisherStudies : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.apCount && report.stats.apCount !== 0 ? report.stats.apCount : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.apHours && report.stats.apHours !== 0 ? report.stats.apHours : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.apStudies && report.stats.apStudies !== 0 ? report.stats.apStudies : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.rpCount && report.stats.rpCount !== 0 ? report.stats.rpCount : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.rpHours && report.stats.rpHours !== 0 ? report.stats.rpHours : ''}</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(0, 0, 0, 0.3)' }}>{report.stats.rpStudies && report.stats.rpStudies !== 0 ? report.stats.rpStudies : ''}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedMonth(report.month);
                          setDetailOpen(true);
                        }}
                      >
                        상세
                      </Button>
                      {managerType === 'super' && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleToggleStatus(report.month, report.status)}
                          sx={{
                            bgcolor: report.status === 'COMPLETED' ? 'grey.500' : 'primary.main',
                            '&:hover': {
                              bgcolor: report.status === 'COMPLETED' ? 'grey.600' : 'primary.dark'
                            }
                          }}
                        >
                          {report.status === 'COMPLETED' ? '완료' : '입력'}
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 로그아웃 버튼 - 테이블 아래 우측측 배치 */}

      <Box sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'flex-end',
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        bgcolor: '#f5f5f5'
      }}>
        <Button
          variant="contained"
          color="inherit"
          onClick={onLogout}
          sx={{
            bgcolor: 'grey.500',
            '&:hover': {
              bgcolor: 'grey.600',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            },
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          로그아웃
        </Button>
      </Box>

      {selectedMonth && (
        <MonthlyReportDetail
          month={selectedMonth}
          managerEmail={email}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          serviceYear={serviceYear} // 봉사연도 전달
        />
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>입력 상태 변경</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmMonth} 보고를 입력 상태로 되돌리시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button onClick={handleConfirmToggle} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={yearMenuAnchor}
        open={Boolean(yearMenuAnchor)}
        onClose={handleYearClose}
      >
        {serviceYears.map((item) => (
          <MenuItem
            key={item.year}
            onClick={() => handleYearSelect(item.year, item.spreadsheetId)}
            selected={item.year === serviceYear}
          >
            {item.year}
          </MenuItem>
        ))}
      </Menu>


    </Container>
  );
}