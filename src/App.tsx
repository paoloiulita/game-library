import {
  CircularProgress, CssBaseline, ThemeProvider, createTheme,
} from '@mui/material';
import {
  BrowserRouter, Navigate, Route, Routes,
} from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import SetupModal from './components/Setup/SetupModal';
import AppProvider, { useAppContext } from './context/AppContext';
import { SheetDataProvider } from './context/SheetDataContext';
import DashboardPage from './pages/DashboardPage';
import GamesPage from './pages/GamesPage';
import StatisticsPage from './pages/StatisticsPage';
import StoresPage from './pages/StoresPage';
import WishlistPage from './pages/WishlistPage';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function AppContent() {
  const { isAuthenticated, isAuthLoading } = useAppContext();

  if (isAuthLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 8 }} />;
  }

  if (!isAuthenticated) {
    return <SetupModal />;
  }

  return (
    <SheetDataProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </SheetDataProvider>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppContent />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
