import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MinistryReportForm from './components/MinistryReportForm';
import ManagerLogin from './components/ManagerLogin';
import ManagerDashboard from './components/ManagerDashboard';
import { initGoogleAPI } from './services/googleSheets';
import { Box, CircularProgress, Typography } from '@mui/material';
import './App.css';

function App() {
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initAPI = async () => {
      try {
        await initGoogleAPI();
        setIsInitializing(false);
      } catch (error) {
        console.error('Google API 초기화 실패:', error);
        setInitError('Google API 초기화에 실패했습니다. 페이지를 새로고침 해주세요.');
        setIsInitializing(false);
      }
    };

    initAPI();
  }, []);

  const handleManagerLogin = (email: string) => {
    setManagerEmail(email);
  };

  const handleManagerLogout = () => {
    setManagerEmail(null);
  };

  if (isInitializing) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>초기화 중...</Typography>
      </Box>
    );
  }

  if (initError) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <Typography color="error">{initError}</Typography>
        <Typography sx={{ mt: 1 }}>
          <button onClick={() => window.location.reload()}>
            새로고침
          </button>
        </Typography>
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 0' }}>
        <Routes>
          <Route path="/" element={<MinistryReportForm />} />
          <Route 
            path="/manager" 
            element={
              managerEmail ? (
                <ManagerDashboard 
                  email={managerEmail} 
                  onLogout={handleManagerLogout}
                />
              ) : (
                <ManagerLogin onLogin={handleManagerLogin} />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
