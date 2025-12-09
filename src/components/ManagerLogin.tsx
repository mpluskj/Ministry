import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  email: string;
}

interface ManagerLoginProps {
  onLogin: (email: string) => void;
}

export default function ManagerLogin({ onLogin }: ManagerLoginProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async (response: CredentialResponse) => {
    try {
      if (!response.credential) {
        throw new Error('로그인 응답에 인증 정보가 없습니다.');
      }

      const decoded = jwtDecode<DecodedToken>(response.credential);
      await onLogin(decoded.email);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : '로그인 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <Box sx={{ 
      maxWidth: 400, 
      mx: 'auto', 
      mt: 4, 
      p: 3, 
      textAlign: 'center' 
    }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        관리자 로그인
      </Typography>

      <Box sx={{ mb: 2 }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError('로그인 중 오류가 발생했습니다.')}
          useOneTap
          type="standard"
        />
      </Box>

      {error && (
        <Typography color="error">
          {error}
        </Typography>
      )}

      <Button 
        variant="text" 
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
      >
        봉사 보고 폼으로 돌아가기
      </Button>
    </Box>
  );
}