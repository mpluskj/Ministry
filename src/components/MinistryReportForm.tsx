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
  '베델봉사',
  '원격봉사',
  '대회자원봉사',
  '병교위',
  '환자방문단',
  '기타',
];

const ALL_MONTHS = [
  '9월', '10월', '11월', '12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월'
];

interface RemarkField {
  type: string;
  hours: string;
  etc?: string;
}

interface Report {
  month: string;
  status: string;
}

interface MinistryReportFormProps {
  reports?: Report[];
}

export default function MinistryReportForm({ reports }: MinistryReportFormProps) {
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
    setRemarks(prev => {
      const newRemarks = [...prev];
      if (field === 'type' && value === '기타') {
        newRemarks[idx] = { type: '기타', hours: '', etc: '' };
      } else if (field === 'etc') {
        newRemarks[idx] = { ...newRemarks[idx], etc: value };
      } else {
        newRemarks[idx] = { ...newRemarks[idx], [field]: value };
      }
      return newRemarks;
    });
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

    // 이름에서 공백 제거
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      setIsSubmitting(false);
      return;
    }

    // 월 선택 확인
    if (!month) {
      setError('월을 선택해주세요.');
      setIsSubmitting(false);
      return;
    }

    if (isClosed) {
      setError(`${month} 보고가 마감되었습니다.`);
      setIsSubmitting(false);
      return;
    }

    // 시간 데이터가 있으면 참여 체크 자동 설정
    const hasHours = hours && parseInt(hours) > 0;
    const autoParticipated = hasHours ? true : participated;

    // 기타 항목 처리 - '기타내용: 00시간' 형식으로 변환
    const processedRemarks = remarks
      .filter(r => r.type || r.hours)
      .map(r => {
        if (r.type === '기타' && r.etc) {
          return {
            ...r,
            type: r.etc,
            hours: r.hours
          };
        }
        return r;
      });

    try {
      await submitMinistryReport({
        name: trimmedName,
        month,
        participated: autoParticipated,
        bibleStudies,
        hours,
        remarks: processedRemarks,
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
        minWidth: 300,
        mx: 'auto',
        mt: 0,
        mb: 2,
        '@media (max-width: 600px)': {
          minWidth: 'unset',
          width: '90%'
        }
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 700,
          textAlign: 'center',
          mb: 2,
          fontSize: '1.4rem',
          color: 'text.primary'
        }}
      >
        야외 봉사 보고
      </Typography>

      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, minWidth: 60, color: 'text.primary' }}>이름:</Typography>
          <Box sx={{ 
            flex: 1, 
            borderBottom: '2px solid',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            ml: 1,
            '& .MuiInputBase-root': {
              height: 24,
              color: 'text.primary'
            }
          }}>
            <TextField 
              variant="standard" 
              value={name} 
              onChange={e => setName(e.target.value.trim())} 
              fullWidth 
              required 
              InputProps={{ 
                disableUnderline: true,
                style: { color: '#000000' }
              }} 
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, minWidth: 60, color: 'text.primary' }}>월:</Typography>
          <Box sx={{ 
            flex: 1,
            borderBottom: '2px solid',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            ml: 1,
            '& .MuiInputBase-root': {
              height: 24,
              color: 'text.primary'
            }
          }}>
            <FormControl variant="standard" fullWidth>
              <Select 
                value={month} 
                onChange={e => setMonth(e.target.value)} 
                displayEmpty 
                disableUnderline
                sx={{ color: 'text.primary' }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.primary' }}>월 선택</MenuItem>
                {ALL_MONTHS
                  .filter(m => {
                    const report = reports?.find(r => r.month === m);
                    return !report || report.status !== 'COMPLETED';
                  })
                  .map(m => (
                    <MenuItem key={m} value={m} sx={{ color: 'text.primary' }}>{m}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      <Box>
        <Box sx={{ 
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.3)',
          p: 1.5,
          borderBottom: 'none',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Box sx={{ color: 'text.primary' }}>
            <Typography sx={{ color: 'text.primary' }}>해당 월에 어떤 식으로든</Typography>
            <Typography sx={{ color: 'text.primary' }}>봉사에 참여했다면</Typography>
            <Typography sx={{ color: 'text.primary' }}>네모에 체크 표시를 하십시오</Typography>
          </Box>
          <Checkbox 
            checked={participated} 
            onChange={e => setParticipated(e.target.checked)} 
            sx={{ 
              p: 0,
              width: 30,
              height: 30,
              border: '2px solid',
              borderColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 0,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
              '& .MuiSvgIcon-root': {
                fontSize: 25,
                color: 'primary.main'
              }
            }} 
          />
        </Box>

        <Box sx={{ 
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.3)',
          p: 1.5,
          borderBottom: 'none',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography sx={{ color: 'text.primary' }}>
            사회한 <span style={{ fontStyle: 'italic', fontWeight: 700 }}>개별</span> 성서 연구 건수
          </Typography>
          <Box sx={{ 
            borderBottom: '2px solid',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            width: 60,
            '& .MuiInputBase-root': {
              height: 24,
              color: 'text.primary'
            }
          }}>
            <TextField
              variant="standard"
              type="number"
              value={bibleStudies === '0' ? '' : bibleStudies}
              onChange={e => setBibleStudies(e.target.value)}
              inputProps={{ 
                min: 0,
                style: { 
                  textAlign: 'right',
                  paddingRight: 4,
                  color: '#000000'
                }
              }}
              fullWidth
              InputProps={{ disableUnderline: true }}
            />
          </Box>
        </Box>

        <Box sx={{ 
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.3)',
          p: 1.5,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'nowrap'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            flex: 1,
            mr: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}>
            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              시간
            </Typography>
            <Typography sx={{ color: 'text.primary' }}>(보조, 정규, 특별 파이오니아)</Typography>
            <Typography sx={{ color: 'text.primary' }}>(야외 선교인인 경우)</Typography>
          </Box>
          <Box sx={{ 
            borderBottom: '2px solid',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            width: 60,
            '& .MuiInputBase-root': {
              height: 24,
              color: 'text.primary'
            }
          }}>
            <TextField
              variant="standard"
              type="number"
              value={hours === '0' ? '' : hours}
              onChange={e => setHours(e.target.value)}
              inputProps={{ 
                min: 0,
                style: { 
                  textAlign: 'right',
                  paddingRight: 4,
                  color: '#000000'
                }
              }}
              fullWidth
              InputProps={{ disableUnderline: true }}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 2, border: '1px solid', borderColor: 'rgba(0, 0, 0, 0.3)', p: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700, minWidth: 30, mr: 2, color: 'text.primary' }}>비고:</Typography>
            <Box display="flex" alignItems="center" flex={1}>
              <FormControl variant="standard" sx={{ 
                minWidth: 60,
                borderBottom: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
                mr: 1,
                '& .MuiInputBase-root': {
                  color: 'text.primary'
                }
              }}>
                <Select
                  value={remarks[0].type}
                  onChange={e => handleRemarkChange(0, 'type', e.target.value)}
                  displayEmpty
                  disableUnderline
                  sx={{ color: 'text.primary' }}
                >
                  <MenuItem value="" disabled sx={{ color: 'text.primary' }}>선택</MenuItem>
                  {REMARK_OPTIONS.map(opt => (
                    <MenuItem key={opt} value={opt} sx={{ color: 'text.primary' }}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {remarks[0].type === '기타' && (
                <FormControl variant="standard" sx={{ 
                  width: 60,
                  mr: 1,
                  borderBottom: '2px solid',
                  borderColor: 'rgba(0, 0, 0, 0.3)',
                  '& .MuiInputBase-root': {
                    color: 'text.primary'
                  }
                }}>
                  <TextField
                    variant="standard"
                    value={remarks[0].etc}
                    onChange={e => handleRemarkChange(0, 'etc', e.target.value)}
                    placeholder="기타 내용"
                    fullWidth
                    InputProps={{ 
                      disableUnderline: true,
                      style: { color: '#000000' }
                    }}
                  />
                </FormControl>
              )}
              <FormControl variant="standard" sx={{ 
                width: 50,
                borderBottom: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
                mr: 1,
                '& .MuiInputBase-root': {
                  color: 'text.primary'
                }
              }}>
                <TextField
                  variant="standard"
                  type="number"
                  value={remarks[0].hours}
                  onChange={e => handleRemarkChange(0, 'hours', e.target.value)}
                  inputProps={{ 
                    min: 0,
                    style: { 
                      textAlign: 'right',
                      paddingRight: 4,
                      color: '#000000'
                    }
                  }}
                  fullWidth
                  InputProps={{ disableUnderline: true }}
                />
              </FormControl>
              <Typography sx={{ color: 'text.primary' }}>시간</Typography>
              <IconButton 
                onClick={() => handleRemoveRemark(0)}
                size="small"
                sx={{ 
                  ml: 1,
                  p: 0.5,
                  color: 'text.primary',
                  '& .MuiSvgIcon-root': {
                    fontSize: 15
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          {remarks.slice(1).map((remark, idx) => (
            <Box key={idx + 1} display="flex" alignItems="center" sx={{ ml: '46px' }}>
              <FormControl variant="standard" sx={{ 
                minWidth: 60,
                borderBottom: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
                mr: 1,
                '& .MuiInputBase-root': {
                  color: 'text.primary'
                }
              }}>
                <Select
                  value={remark.type}
                  onChange={e => handleRemarkChange(idx + 1, 'type', e.target.value)}
                  displayEmpty
                  disableUnderline
                  sx={{ color: 'text.primary' }}
                >
                  <MenuItem value="" disabled sx={{ color: 'text.primary' }}>선택</MenuItem>
                  {REMARK_OPTIONS.map(opt => (
                    <MenuItem key={opt} value={opt} sx={{ color: 'text.primary' }}>{opt}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {remark.type === '기타' && (
                <FormControl variant="standard" sx={{ 
                  width: 60,
                  mr: 1,
                  borderBottom: '2px solid',
                  borderColor: 'rgba(0, 0, 0, 0.3)',
                  '& .MuiInputBase-root': {
                    color: 'text.primary'
                  }
                }}>
                  <TextField
                    variant="standard"
                    value={remark.etc}
                    onChange={e => handleRemarkChange(idx + 1, 'etc', e.target.value)}
                    placeholder="기타 내용"
                    fullWidth
                    InputProps={{ 
                      disableUnderline: true,
                      style: { color: '#000000' }
                    }}
                  />
                </FormControl>
              )}
              <FormControl variant="standard" sx={{ 
                width: 50,
                borderBottom: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
                mr: 1,
                '& .MuiInputBase-root': {
                  color: 'text.primary'
                }
              }}>
                <TextField
                  variant="standard"
                  type="number"
                  value={remark.hours}
                  onChange={e => handleRemarkChange(idx + 1, 'hours', e.target.value)}
                  inputProps={{ 
                    min: 0,
                    style: { 
                      textAlign: 'right',
                      paddingRight: 4,
                      color: '#000000'
                    }
                  }}
                  fullWidth
                  InputProps={{ disableUnderline: true }}
                />
              </FormControl>
              <Typography sx={{ color: 'text.primary' }}>시간</Typography>
              <IconButton 
                onClick={() => handleRemoveRemark(idx + 1)}
                size="small"
                sx={{ 
                  ml: 1,
                  p: 0.5,
                  color: 'text.primary',
                  '& .MuiSvgIcon-root': {
                    fontSize: 15
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ mt: 0.5, ml: '46px' }}>
            <IconButton 
              color="primary" 
              onClick={addRemarkField} 
              size="small"
              sx={{ 
                p: 0.5,
                '& .MuiSvgIcon-root': {
                  fontSize: 15
                }
              }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 1.5, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Box sx={{ 
        mt: 2,
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          ChunCheonNamboo 05/25
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
