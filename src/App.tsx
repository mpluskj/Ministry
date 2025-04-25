import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MinistryReportForm from './components/MinistryReportForm';
import ManagerLogin from './components/ManagerLogin';
import ManagerDashboard from './components/ManagerDashboard';
import { initGoogleAPI } from './services/googleSheets';
import { Box, CircularProgress, Typography } from '@mui/material';
import './App.css';

function App() {
  const [isManager, setIsManager] = useState<boolean>(false);
  const [managerEmail, setManagerEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initGoogleAPI();
      } catch (err) {
        setError('Google API 초기화에 실패했습니다.');
        console.error('Failed to initialize Google API:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh'
      }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh'
      }}>
        <Typography color="error">{error}</Typography>
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
              !isManager ? (
                <ManagerLogin onLogin={(email) => {
                  setIsManager(true);
                  setManagerEmail(email);
                }} />
              ) : (
                <ManagerDashboard 
                  email={managerEmail}
                  onLogout={() => {
                    setIsManager(false);
                    setManagerEmail('');
                  }}
                />
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
