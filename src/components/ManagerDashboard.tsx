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
  Card,
  CardContent,
  Chip,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
  const theme = useTheme();
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

  const loadData = React.useCallback(async () => {
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
  }, [email]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      py: 4,
      position: 'relative',
      minHeight: '100vh',
      bgcolor: '#f4f6f8',
    }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'center', md: 'flex-start' },
        mb: 4,
        gap: 2
      }}>
        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
              letterSpacing: '-0.5px'
            }}
          >
            {sheetTitle || 'Ministry Dashboard'}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              justifyContent: { xs: 'center', md: 'flex-start' }
            }}
          >
            <Chip 
              label={groupName ? `${groupName} 봉사 집단` : '전체 회중'} 
              size="small" 
              color="primary" 
              variant="outlined" 
              sx={{ fontWeight: 'bold' }}
            />
            {managerName} {managerType === 'super' ? '총관리자' : '관리자'}님
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadData}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            새로고침
          </Button>
          <Button
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            variant="contained"
            color="error"
            sx={{ 
              borderRadius: 2,
              boxShadow: theme.shadows[2]
            }}
          >
            로그아웃
          </Button>
        </Box>
      </Box>

      {/* Main Content Card */}
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{
            overflowX: 'auto',
            width: '100%',
            '&::-webkit-scrollbar': {
              height: '8px'
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c1c1c1',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#a8a8a8'
              }
            }
          }}>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell
                      align="center"
                      onClick={handleYearClick}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: 'primary.main',
                        borderBottom: '2px solid rgba(0,0,0,0.05)',
                        whiteSpace: 'nowrap',
                        py: 2,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {serviceYear}
                        <KeyboardArrowDownIcon fontSize="small" />
                      </Box>
                    </TableCell>
                    <Menu
                      anchorEl={yearMenuAnchor}
                      open={Boolean(yearMenuAnchor)}
                      onClose={handleYearClose}
                      PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 120 } }}
                    >
                      {serviceYears.map((yearOption) => (
                        <MenuItem
                          key={yearOption.year}
                          onClick={() => handleYearSelect(yearOption.year, yearOption.spreadsheetId)}
                          selected={yearOption.year === serviceYear}
                          sx={{ fontWeight: yearOption.year === serviceYear ? 'bold' : 'normal' }}
                        >
                          {yearOption.year}
                        </MenuItem>
                      ))}
                    </Menu>
                    
                    {[
                      '보고자 수', '전도인 수', '전도인 연구', 
                      '보조 수', '보조 시간', '보조 연구', 
                      '정규 수', '정규 시간', '정규 연구', '관리'
                    ].map((header) => (
                      <TableCell 
                        key={header} 
                        align="center" 
                        sx={{ 
                          fontWeight: 700, 
                          color: 'text.secondary',
                          borderBottom: '2px solid rgba(0,0,0,0.05)',
                          whiteSpace: 'nowrap',
                          py: 2
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(reports) && reports.map((report) => (
                    <TableRow
                      key={report.month}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.02) !important' },
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          borderRight: '1px solid rgba(0,0,0,0.03)'
                        }}
                      >
                        {report.month}
                      </TableCell>
                      
                      {[
                        report.stats.totalReporters,
                        report.stats.publisherCount,
                        report.stats.publisherStudies,
                        report.stats.apCount,
                        report.stats.apHours,
                        report.stats.apStudies,
                        report.stats.rpCount,
                        report.stats.rpHours,
                        report.stats.rpStudies
                      ].map((value, idx) => (
                        <TableCell 
                          key={idx} 
                          align="center"
                          sx={{ 
                            color: value ? 'text.primary' : 'text.disabled',
                            borderRight: idx < 8 ? '1px solid rgba(0,0,0,0.03)' : 'none'
                          }}
                        >
                          {value && value !== 0 ? value.toLocaleString() : '-'}
                        </TableCell>
                      ))}

                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedMonth(report.month);
                              setDetailOpen(true);
                            }}
                            sx={{ borderRadius: 1.5, minWidth: 60 }}
                          >
                            상세
                          </Button>
                          {managerType === 'super' && (
                            <Tooltip title={report.status === 'COMPLETED' ? "입력 마감됨 (클릭하여 다시 열기)" : "입력 중 (클릭하여 마감하기)"}>
                              <Chip
                                label={report.status === 'COMPLETED' ? '완료' : '입력중'}
                                color={report.status === 'COMPLETED' ? 'default' : 'success'}
                                size="small"
                                onClick={() => handleToggleStatus(report.month, report.status)}
                                sx={{ 
                                  cursor: 'pointer', 
                                  fontWeight: 'bold', 
                                  minWidth: 60,
                                  '&:hover': { opacity: 0.9 }
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">데이터가 없습니다.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

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