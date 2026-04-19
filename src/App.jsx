import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import ReportsPage from './pages/ReportsPage';
import MapPage from './pages/MapPage';
import OfficialsPage from './pages/OfficialsPage';
import DashboardPage from './pages/DashboardPage';
import VoiceReportPage from './pages/VoiceReportPage';

function App() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="animate-in fade-in duration-500">
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/voice-report" element={<VoiceReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/officials" element={<OfficialsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
