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
} from '@mui/material';

import './YearlyReportCard.css';
import CloseIcon from '@mui/icons-material/Close';
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
          color: 'text.primary'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#9e9e9e',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.5rem',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ width: '100%', textAlign: 'center', color: 'white', fontWeight: 'bold' }}>회중용 전도인 기록 카드</Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
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
        ) : (
          <Box>
            <Box sx={{ 
              mb: 3,
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 2,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              mx: '2pt'
            }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 2,
                px: '2pt'
              }}>
                <Typography sx={{ color: 'black' }}><strong>이름:</strong> {userInfo.name}</Typography>
                <Typography sx={{ color: 'black' }}><strong>생년월일:</strong> {userInfo.birthDate}</Typography>
                <Typography sx={{ color: 'black' }}><strong>성별:</strong> {userInfo.gender}</Typography>
                <Typography sx={{ color: 'black' }}><strong>침례일자:</strong> {userInfo.baptismDate}</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{userInfo.hope}</Typography>
                <Typography component="span" sx={{ fontWeight: 'bold' }}>{[userInfo.isElder && '장로',
                  userInfo.isMinisterialServant && '봉사의 종',
                  userInfo.isRegularPioneer && '정규 파이오니아',
                  userInfo.isSpecialPioneer && '특별 파이오니아',
                  userInfo.isMissionary && '야외 선교인'].filter(Boolean).join(', ')}</Typography>
              </Box>
            </Box>
            <TableContainer component={Paper} sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <Table size="small" sx={{ 
                '& .MuiTableCell-root': { 
                  borderColor: 'divider',
                  padding: '8px',
                  fontSize: '0.875rem',
                  border: '1px solid rgb(80, 80, 80)'
                }
              }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#e0e0e0' }}>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '80px' }}>{serviceYear}</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '80px' }}>참여</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '80px' }}>성서연구</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '80px' }}>보조 파이오니아</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '80px' }}>시간</TableCell>
                    <TableCell align="center" sx={{ color: 'black', fontWeight: 'bold', width: '200px' }}>비고</TableCell>
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
                        sx={{
                          bgcolor: index % 2 === 0 ? '#f9f9f9' : 'white',
                          '&:hover': {
                            bgcolor: '#e3f2fd',
                            '& .MuiTableCell-root': {
                              color: '#1976d2'
                            }
                          }
                        }}
                      >
                        <TableCell align="center">{month}</TableCell>
                        <TableCell align="center">{monthData.participated ? 'Y' : ''}</TableCell>
                        <TableCell align="center">{typeof monthData.bibleStudies === 'number' && monthData.bibleStudies > 0 ? monthData.bibleStudies : ''}</TableCell>
                        <TableCell align="center">{monthData.division === 'AP' ? 'Y' : ''}</TableCell>
                        <TableCell align="center">{typeof monthData.hours === 'number' && monthData.hours > 0 ? monthData.hours : ''}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-line' }}>{monthData.remarks}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ 
                    bgcolor: '#e0e0e0', 
                    fontWeight: 'bold',
                    '& .MuiTableCell-root': {
                      fontWeight: 'bold',
                      color: '#424242'
                    }
                  }}>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>합계</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {monthlyRecords.reduce((sum, record) => sum + (typeof record.bibleStudies === 'number' ? record.bibleStudies : 0), 0) || ''}
                    </TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      {monthlyRecords.reduce((sum, record) => sum + (typeof record.hours === 'number' ? record.hours : 0), 0) || ''}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
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
              justifyContent: 'space-between', 
              mt: 3 
            }}>
              <Button
                onClick={handleGeneratePdf}
                variant="contained"
                color="primary"
                disabled={isGenerating}
                sx={{
                  fontWeight: 'bold',
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  },
                  position: 'relative',
                }}
              >
                {isGenerating ? (
                  <>
                    <CircularProgress size={24} sx={{
                       color: 'primary.light',
                       position: 'absolute',
                       top: '50%',
                       left: '50%',
                       marginTop: '-12px',
                       marginLeft: '-12px',
                    }}/>
                    생성 중...
                  </>
                ) : (
                  '전도인카드 출력'
                )}
              </Button>
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
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}