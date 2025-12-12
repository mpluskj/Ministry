import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css'
import MinistryReportForm from './components/MinistryReportForm';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerLogin from './components/ManagerLogin';
import PDFCoordinateTest from './components/PDFCoordinateTest';

// Google OAuth 클라이언트 ID
const GOOGLE_CLIENT_ID = '497507205467-hic2647a8dbe9im2n68ljcftc5pf3pkv.apps.googleusercontent.com';

// 라우트 가드 컴포넌트
function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const managerEmail = localStorage.getItem('managerEmail');

  if (!managerEmail && location.pathname === '/dashboard') {
    return <Navigate to="/manager" replace />;
  }

  if (managerEmail && location.pathname === '/manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [managerEmail, setManagerEmail] = useState<string | null>(() => {
    return localStorage.getItem('managerEmail');
  });

  useEffect(() => {
    document.title = '봉사 보고 시스템';
  }, []);

  const handleLogin = (email: string) => {
    setManagerEmail(email);
    localStorage.setItem('managerEmail', email);
  };

  const handleLogout = () => {
    setManagerEmail(null);
    localStorage.removeItem('managerEmail');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router basename="/Ministry">
        <AuthGuard>
          <Routes>
            <Route path="/manager" element={<ManagerLogin onLogin={handleLogin} />} />
            <Route
              path="/dashboard"
              element={<ManagerDashboard email={managerEmail || ''} onLogout={handleLogout} />}
            />
            <Route path="/pdf-test" element={<PDFCoordinateTest />} />
            <Route path="/" element={<MinistryReportForm />} />
          </Routes>
        </AuthGuard>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
