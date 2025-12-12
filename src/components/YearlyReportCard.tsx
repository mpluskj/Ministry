import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress,
  Grid,
  Divider,
  useTheme,
  Chip,
} from '@mui/material';

import './YearlyReportCard.css';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { getYearlyReport, getServiceYears } from '../services/clientService';
import { generatePublisherCard } from '../utils/pdfTemplateOverlay';

interface YearlyReportCardProps {
  name: string;
  managerEmail: string;
  open: boolean;
  onClose: () => void;
}

interface MonthlyRecord {
  month: string;
  participated: boolean;
  bibleStudies: number | string;
  hours: number | string;
  remarks: string | string[];
  division: string;
}

interface UserInfo {
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

interface YearlyReportData {
  userInfo: UserInfo;
  monthlyRecords: MonthlyRecord[];
}

export default function YearlyReportCard({
  name,
  managerEmail,
  open,
  onClose,
}: YearlyReportCardProps) {
  const theme = useTheme();
  const [reportData, setReportData] = useState<YearlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceYear, setServiceYear] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const MONTHS = ['9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'];
  
  const handleGeneratePdf = async () => {
    if (!reportData) return;
    setIsGenerating(true);
    try {
      const pdfBytes = await generatePublisherCard(reportData, serviceYear);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `전도인카드_${name}_${serviceYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      setError(err instanceof Error ? err.message : 'PDF를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (open) {
        try {
          const [serviceYearData, yearlyData] = await Promise.all([
            getServiceYears(),
            getYearlyReport(name, managerEmail)
          ]);
          setServiceYear(serviceYearData.currentYear);
          setReportData(yearlyData);
        } catch (error) {
          console.error('Error loading data:', error);
          setError(error instanceof Error ? error.message : '데이터 로딩 중 오류가 발생했습니다.');
          setReportData({ userInfo: {}, monthlyRecords: [] });
        } finally {
          setLoading(false);
        }
      }
    };
    if (open) {
      setLoading(true);
      setError(null);
      init();
    }
  }, [open, name, managerEmail]);



  const userInfo = reportData?.userInfo || {};
  const monthlyRecords = reportData?.monthlyRecords || [];



  useEffect(() => {
    if (open) {
      window.history.pushState(null, '', window.location.pathname);
      const handlePopState = () => {
        onClose();
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main',
        color: 'white',
        py: 2,
        px: 3,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            회중용 전도인 기록 카드
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ 
        bgcolor: '#f8fafc', 
        p: { xs: 2, md: 4 }
      }}>
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '300px'
          }}>
            <CircularProgress size={40} thickness={4} />
            <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
              데이터를 불러오는 중입니다...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6">{error}</Typography>
          </Box>
        ) : (
          <Box>
            {/* Personal Info Section */}
            <Paper elevation={0} sx={{ 
              mb: 3,
              bgcolor: 'white',
              p: 3,
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.08)'
            }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1, alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">이름</Typography>
                    <Typography variant="body1" fontWeight="bold">{userInfo.name}</Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary">생년월일</Typography>
                    <Typography variant="body1">{userInfo.birthDate}</Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary">성별</Typography>
                    <Typography variant="body1">{userInfo.gender}</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1, alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">침례일자</Typography>
                    <Typography variant="body1">{userInfo.baptismDate}</Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary">희망</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">{userInfo.hope}</Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary">직책/신분</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {[userInfo.isElder && '장로',
                        userInfo.isMinisterialServant && '봉사의 종',
                        userInfo.isRegularPioneer && '정규 파이오니아',
                        userInfo.isSpecialPioneer && '특별 파이오니아',
                        userInfo.isMissionary && '야외 선교인'].filter(Boolean).map((role) => (
                          <Chip key={role as string} label={role as string} size="small" color="secondary" variant="outlined" />
                        ))}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Table Section */}
            <TableContainer component={Paper} elevation={0} sx={{ 
              borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>{serviceYear}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>참여</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>성서연구</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>보조 파이오니아</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>시간</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid rgba(0,0,0,0.1)', minWidth: 200 }}>비고</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MONTHS.map((month, index) => {
                    const monthData = monthlyRecords.find(data => data.month === month) || {
                      participated: false,
                      bibleStudies: 0,
                      hours: 0,
                      remarks: '',
                      division: ''
                    };
                    return (
                      <TableRow 
                        key={month}
                        hover
                        sx={{
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.02) !important' }
                        }}
                      >
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'text.secondary', fontWeight: 500 }}>{month}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{monthData.participated ? '✔' : ''}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{typeof monthData.bibleStudies === 'number' && monthData.bibleStudies > 0 ? monthData.bibleStudies : ''}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{monthData.division === 'AP' ? '✔' : ''}</TableCell>
                        <TableCell align="center" sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{typeof monthData.hours === 'number' && monthData.hours > 0 ? monthData.hours : ''}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'pre-line', fontSize: '0.85rem' }}>{monthData.remarks}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: '#e2e8f0' }}>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>합계</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {monthlyRecords.reduce((sum, record) => sum + (typeof record.bibleStudies === 'number' ? record.bibleStudies : 0), 0) || ''}
                    </TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {monthlyRecords.reduce((sum, record) => sum + (typeof record.hours === 'number' ? record.hours : 0), 0) || ''}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {monthlyRecords.reduce((sum, record) => {
                        const matches = String(record.remarks).match(/: (\d+)시간/g);
                        if (!matches) return sum;
                        return sum + matches.reduce((hoursSum, match) => {
                          const matchResult = match.match(/\d+/);
                          if (!matchResult) return hoursSum;
                          const hours = parseInt(matchResult[0]);
                          return hoursSum + (isNaN(hours) ? 0 : hours);
                        }, 0);
                      }, 0) || ''}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 2,
              mt: 4 
            }}>
              <Button
                onClick={onClose}
                variant="outlined"
                color="inherit"
                sx={{ borderRadius: 2, minWidth: 100 }}
              >
                닫기
              </Button>
              <Button
                onClick={handleGeneratePdf}
                variant="contained"
                color="primary"
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                disabled={isGenerating}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  boxShadow: theme.shadows[2]
                }}
              >
                {isGenerating ? '생성 중...' : '전도인카드 출력'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}