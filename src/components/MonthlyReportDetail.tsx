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
} from '@mui/material';

interface MonthlyReportDetailProps {
  month: string;
  managerEmail: string;
  open: boolean;
  onClose: () => void;
}

interface ReportData {
  name: string;
  participated: boolean;
  bibleStudies: string;
  hours: string;
  remarks: string[];
  rp: string;
  position: string;
  group: string;
}

export default function MonthlyReportDetail({
  month,
  managerEmail,
  open,
  onClose,
}: MonthlyReportDetailProps) {
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `http://localhost:4000/api/monthly-detail?month=${encodeURIComponent(month)}&email=${encodeURIComponent(managerEmail)}`
        );
        
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const reportData = await response.json();
        if (!Array.isArray(reportData)) {
          console.error('Unexpected data format:', reportData);
          throw new Error('데이터 형식이 올바르지 않습니다.');
        }

        setData(reportData);
      } catch (error) {
        console.error('Error loading report detail:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [month, managerEmail, open]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {month} 봉사보고 상세
        </Typography>

        {loading ? (
          <Typography>데이터 로딩 중...</Typography>
        ) : error ? (
          <Typography color="error" sx={{ my: 2 }}>{error}</Typography>
        ) : data.length === 0 ? (
          <Typography sx={{ my: 2 }}>데이터가 없습니다.</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>이름</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>봉사참여</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>성서연구</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>시간</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>비고</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>RP</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>AP</TableCell>
                  <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>직책</TableCell>
                  <TableCell align="center">집단</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.participated ? 'Y' : 'N'}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.bibleStudies}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.hours}</TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                      {row.remarks.join('\n')}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                      {row.rp === 'RP' ? 'Y' : ''}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                      {row.rp === 'AP' ? 'Y' : ''}
                    </TableCell>
                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>{row.position}</TableCell>
                    <TableCell align="center">{row.group}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>닫기</Button>
        </Box>
      </Box>
    </Dialog>
  );
}