import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { type ReactNode } from 'react';

import { useGameDataContext } from '../context/GameDataContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StatisticsPage() {
  const {
    isLoading: gamesLoading,
    statisticsHistory,
    isHistoryLoading,
  } = useGameDataContext();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isPageLoading = gamesLoading || isHistoryLoading;
  const historyNewestFirst = statisticsHistory;

  let bodyContent: ReactNode;
  if (isPageLoading) {
    bodyContent = (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (historyNewestFirst.length === 0) {
    bodyContent = (
      <Typography color="text.secondary">
        No statistics available yet.
      </Typography>
    );
  } else {
    bodyContent = (
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 520 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Finished</TableCell>
              <TableCell align="right">Put Aside</TableCell>
              <TableCell align="right">Not Yet Played</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historyNewestFirst.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={`${entry.date}-${index}`} hover>
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell align="right">{entry.finished}</TableCell>
                <TableCell align="right">{entry.putAside}</TableCell>
                <TableCell align="right">{entry.notYetPlayed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Statistics
        </Typography>
      </Box>

      {bodyContent}
    </Box>
  );
}

export default StatisticsPage;
