import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import {
  BrowserRouter, Navigate, Route, Routes,
} from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import SetupModal from './components/Setup/SetupModal';
import AppProvider, { useAppContext } from './context/AppContext';
import DashboardPage from './pages/DashboardPage';
import GamesPage from './pages/GamesPage';
import StatisticsPage from './pages/StatisticsPage';
import StoresPage from './pages/StoresPage';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function AppContent() {
  const { isAuthenticated } = useAppContext();

  if (!isAuthenticated) {
    return <SetupModal />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
