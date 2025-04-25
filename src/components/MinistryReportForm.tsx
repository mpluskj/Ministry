import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { submitMinistryReport, checkMonthStatus } from '../services/clientService';

const REMARK_OPTIONS = [
  'LDC',
  '원격봉사',
  '대회자원봉사',
  '병교위',
  '환자방문단',
  '기타',
];

const MONTHS = [
  '9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'
];

interface RemarkField {
  type: string;
  hours: string;
  etc?: string;
}

export default function MinistryReportForm() {
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [participated, setParticipated] = useState(false);
  const [bibleStudies, setBibleStudies] = useState('');
  const [hours, setHours] = useState('');
  const [remarks, setRemarks] = useState<RemarkField[]>([
    { type: '', hours: '', etc: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!month) {
      setIsClosed(null);
      return;
    }
    // 월이 선택되면 마감 여부 확인
    checkMonthStatus(month)
      .then(data => setIsClosed(data.isClosed))
      .catch(() => setIsClosed(null));
  }, [month]);

  const handleRemarkChange = (idx: number, field: keyof RemarkField, value: string) => {
    setRemarks(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRemarkField = () => {
    setRemarks(prev => [...prev, { type: '', hours: '', etc: '' }]);
  };

  const handleRemoveRemark = (idx: number) => {
    setRemarks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (isClosed) {
      setError(`${month} 보고가 마감되었습니다.`);
      setIsSubmitting(false);
      return;
    }

    try {
      await submitMinistryReport({
        name,
        month,
        participated,
        bibleStudies,
        hours,
        remarks: remarks.filter(r => r.type || r.hours),
      });

      // 폼 초기화
      setName('');
      setMonth('');
      setParticipated(false);
      setBibleStudies('');
      setHours('');
      setRemarks([{ type: '', hours: '', etc: '' }]);

      alert('봉사 보고가 성공적으로 제출되었습니다.');
    } catch (error) {
      console.error('제출 오류:', error);
      setError(error instanceof Error ? error.message : '보고 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} 
      sx={{ 
        maxWidth: 580, 
        mx: 'auto', 
        mt: 0, 
        mb: 4
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 700, 
          textAlign: 'center',
          mb: 3,
          fontSize: '1.4rem'
        }}
      >
        야외 봉사 보고
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, minWidth: 60 }}>이름:</Typography>
          <Box sx={{ 
            flex: 1, 
            borderBottom: '1px solid #666',
            ml: 1,
            '& .MuiInputBase-root': {
              height: 24
            }
          }}>
            <TextField 
              variant="standard" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              fullWidth 
              required 
              InputProps={{ disableUnderline: true }} 
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, minWidth: 60 }}>월:</Typography>
          <Box sx={{ 
            flex: 1,
            borderBottom: '1px solid #666',
            ml: 1,
            '& .MuiInputBase-root': {
              height: 24
            }
          }}>
            <FormControl variant="standard" fullWidth>
              <Select 
                value={month} 
                onChange={e => setMonth(e.target.value)} 
                displayEmpty 
                disableUnderline
              >
                <MenuItem value="" disabled>월 선택</MenuItem>
                {MONTHS.map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      <Box>
        <Box sx={{ 
          border: '1px solid #000',
          p: 2,
          borderBottom: 'none',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Box>
            <Typography>해당 월에 어떤 식으로든 봉사에 참여했다면</Typography>
            <Typography>네모에 체크 표시를 하십시오</Typography>
          </Box>
          <Checkbox 
            checked={participated} 
            onChange={e => setParticipated(e.target.checked)} 
            sx={{ 
              p: 0,
              width: 25,
              height: 25,
              border: '1px solid #000',
              borderRadius: 0,
              bgcolor: '#fff',
              '&:hover': { bgcolor: '#fff' },
              '& .MuiSvgIcon-root': {
                fontSize: 18
              }
            }} 
          />
        </Box>

        <Box sx={{ 
          border: '1px solid #000',
          p: 2,
          borderBottom: 'none',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography>
            사회한 <span style={{ fontStyle: 'italic', fontWeight: 700 }}>개별</span> 성서 연구 건수
          </Typography>
          <Box sx={{ 
            borderBottom: '1px solid #666',
            width: 80,
            '& .MuiInputBase-root': {
              height: 24
            }
          }}>
            <TextField
              variant="standard"
              type="number"
              value={bibleStudies}
              onChange={e => setBibleStudies(e.target.value)}
              inputProps={{ 
                min: 0,
                style: { 
                  textAlign: 'right',
                  paddingRight: 4
                }
              }}
              fullWidth
            />
          </Box>
        </Box>

        <Box sx={{ 
          border: '1px solid #000',
          p: 2,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              시간
            </Typography>
            <Typography component="span" sx={{ ml: 1 }}>
              (보조, 정규, 특별 파이오니아, 야외 선교인인 경우)
            </Typography>
          </Box>
          <Box sx={{ 
            borderBottom: '1px solid #666',
            width: 80,
            '& .MuiInputBase-root': {
              height: 24
            }
          }}>
            <TextField
              variant="standard"
              type="number"
              value={hours}
              onChange={e => setHours(e.target.value)}
              inputProps={{ 
                min: 0,
                style: { 
                  textAlign: 'right',
                  paddingRight: 4
                }
              }}
              fullWidth
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 3, border: '1px solid #000', p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>비고:</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {remarks.map((remark, idx) => (
            <Box key={idx} display="flex" alignItems="center">
              <FormControl variant="standard" sx={{ 
                minWidth: 120,
                borderBottom: '1px solid #666',
                mr: 1
              }}>
                <Select
                  value={remark.type}
                  onChange={e => handleRemarkChange(idx, 'type', e.target.value)}
                  displayEmpty
                  disableUnderline
                >
                  <MenuItem value="" disabled>선택</MenuItem>
                  {REMARK_OPTIONS.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl variant="standard" sx={{ 
                width: 60,
                borderBottom: '1px solid #666',
                mr: 1
              }}>
                <TextField
                  variant="standard"
                  type="number"
                  value={remark.hours}
                  onChange={e => handleRemarkChange(idx, 'hours', e.target.value)}
                  inputProps={{ 
                    min: 0,
                    style: { 
                      textAlign: 'right',
                      paddingRight: 4
                    }
                  }}
                  fullWidth
                  InputProps={{ disableUnderline: true }}
                />
              </FormControl>
              <Typography>시간</Typography>
              {remark.type === '기타' && (
                <FormControl variant="standard" sx={{ 
                  width: 120,
                  ml: 1,
                  borderBottom: '1px solid #666'
                }}>
                  <TextField
                    variant="standard"
                    value={remark.etc}
                    onChange={e => handleRemarkChange(idx, 'etc', e.target.value)}
                    placeholder="기타 내용"
                    fullWidth
                    InputProps={{ disableUnderline: true }}
                  />
                </FormControl>
              )}
              <IconButton 
                onClick={() => handleRemoveRemark(idx)}
                size="small"
                sx={{ 
                  ml: 1,
                  p: 0.5,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ mt: 1 }}>
            <IconButton 
              color="primary" 
              onClick={addRemarkField} 
              size="small"
              sx={{ 
                p: 0.5,
                '& .MuiSvgIcon-root': {
                  fontSize: 20
                }
              }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Box sx={{ 
        mt: 3,
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
          S-4-KO 11/23
        </Typography>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
          sx={{ 
            py: 0.5,
            px: 3,
            minWidth: 80,
            borderRadius: 0,
            textTransform: 'none',
            boxShadow: 'none'
          }}
        >
          {isSubmitting ? '제출 중...' : '제출'}
        </Button>
      </Box>
    </Box>
  );
}
