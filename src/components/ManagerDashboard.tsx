import { useState, useEffect } from 'react';
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
} from '@mui/material';
import MonthlyReportDetail from './MonthlyReportDetail';

interface MonthlyStats {
  totalReporters: number;
  totalBibleStudies: number;
  publisherCount: number;
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

  const MONTHS = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];

  useEffect(() => {
    loadData();
  }, [email]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 관리자 유형 확인
      const typeResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/manager-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const typeData = await typeResponse.json();
      setManagerType(typeData.type);
      setGroupName(typeData.groupName);

      // 각 월별 데이터 로드
      const monthlyData = await Promise.all(
        MONTHS.map(async (month) => {
          // 마감 상태 조회
          const statusResp = await fetch(`${import.meta.env.VITE_API_URL}/api/status?month=${encodeURIComponent(month)}`);
          const { status } = await statusResp.json();

          // 통계 데이터 조회
          const statsResp = await fetch(`${import.meta.env.VITE_API_URL}/api/monthly-stats?month=${encodeURIComponent(month)}&email=${encodeURIComponent(email)}`);
          const stats = await statsResp.json();

          return { month, status, stats };
        })
      );

      setReports(monthlyData);
    } catch (error) {
      console.error('Error loading data:', error);
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

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, currentStatus })
      });
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmMonth) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: confirmMonth, currentStatus: 'COMPLETED' })
      });
      await loadData(); // 데이터 새로고침
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setConfirmOpen(false);
      setConfirmMonth(null);
    }
  };

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          {managerType === 'super' ? '최고관리자' : 
           (groupName ? `${groupName} 집단 관리자` : '집단관리자')} 대시보드
        </Typography>
        <Button variant="outlined" onClick={onLogout}>로그아웃</Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>월</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>보고자 수</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>전도인 수</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>전도인 연구</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>보조 수</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>보조 시간</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>보조 연구</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>정규 수</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>정규 시간</TableCell>
              <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>정규 연구</TableCell>
              <TableCell align="center">관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.month}>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.month}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.totalReporters || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.publisherCount || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.totalBibleStudies || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.apCount || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.apHours || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.apStudies || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.rpCount || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.rpHours || 0}</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{report.stats.rpStudies || 0}</TableCell>
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
                      >
                        {report.status === 'COMPLETED' ? '완료' : '마감'}
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedMonth && (
        <MonthlyReportDetail
          month={selectedMonth}
          managerEmail={email}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>마감 상태 변경</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmMonth} 보고를 마감 상태로 되돌리시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button onClick={handleConfirmToggle} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}