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

const getNotPlayedPercentage = (
  finished: number,
  putAside: number,
  notYetPlayed: number,
): number => {
  const total = finished + putAside + notYetPlayed;
  return total === 0 ? 0 : (notYetPlayed / total) * 100;
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
  const historyNewestFirst = statisticsHistory.map((entry, index) => {
    const total = entry.finished + entry.putAside + entry.notYetPlayed;
    const notPlayedPercentage = getNotPlayedPercentage(
      entry.finished,
      entry.putAside,
      entry.notYetPlayed,
    );
    const previousEntry = statisticsHistory[index + 1];
    const previousPercentage = previousEntry
      ? getNotPlayedPercentage(
        previousEntry.finished,
        previousEntry.putAside,
        previousEntry.notYetPlayed,
      )
      : null;

    return {
      ...entry,
      total,
      notPlayedPercentage,
      percentageDifference: previousPercentage === null
        ? null
        : notPlayedPercentage - previousPercentage,
    };
  });

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
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Finished</TableCell>
              <TableCell align="right">Put Aside</TableCell>
              <TableCell align="right">Not Yet Played</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">% Not Played</TableCell>
              <TableCell align="right">% Difference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historyNewestFirst.map((entry) => (
              <TableRow key={entry.id} hover>
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell align="right">{entry.finished}</TableCell>
                <TableCell align="right">{entry.putAside}</TableCell>
                <TableCell align="right">{entry.notYetPlayed}</TableCell>
                <TableCell align="right">{entry.total}</TableCell>
                <TableCell align="right">
                  {entry.notPlayedPercentage.toFixed(2)}
                  %
                </TableCell>
                <TableCell align="right">
                  {entry.percentageDifference === null
                    ? '—'
                    : `${entry.percentageDifference >= 0 ? '+' : ''}${entry.percentageDifference.toFixed(2)}%`}
                </TableCell>
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
