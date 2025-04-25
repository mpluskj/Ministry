import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import './App.css'
import MinistryReportForm from './components/MinistryReportForm';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerLogin from './components/ManagerLogin';

function App() {
  const [managerEmail, setManagerEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = '봉사 보고 시스템';
  }, []);

  const handleLogout = () => {
    setManagerEmail(null);
  };

  return (
    <Router basename="/Ministry">
      <Routes>
        <Route path="/manager" element={<ManagerLogin onLogin={setManagerEmail} />} />
        <Route 
          path="/dashboard" 
          element={
            managerEmail ? (
              <ManagerDashboard email={managerEmail} onLogout={handleLogout} />
            ) : (
              <Navigate to="/manager" replace />
            )
          } 
        />
        <Route path="/" element={<MinistryReportForm />} />
      </Routes>
    </Router>
  );
}

export default App;
