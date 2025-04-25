import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';
import { checkManagerAccess, signInIfNeeded } from '../services/googleSheets';

interface ManagerLoginProps {
  onLogin: (email: string) => void;
}

export default function ManagerLogin({ onLogin }: ManagerLoginProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInIfNeeded(); // 관리자 로그인 시 구글 인증
      const hasAccess = await checkManagerAccess(email);
      if (hasAccess) {
        onLogin(email);
      } else {
        setError('관리자 권한이 없습니다.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh' 
    }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" component="h1" gutterBottom textAlign="center">
          관리자 로그인
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="구글 이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            margin="normal"
          />
          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={isLoading}
          >
            {isLoading ? '확인 중...' : '로그인'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}