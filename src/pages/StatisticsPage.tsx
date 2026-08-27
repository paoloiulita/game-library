import AddchartIcon from '@mui/icons-material/Addchart';
import {
  Box,
  Button,
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
import { type ReactNode, useState } from 'react';

import { useGameDataContext } from '../context/GameDataContext';
import { createStatistic } from '../services/supabaseRepository';

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

const isCurrentMonth = (iso: string): boolean => {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth();
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StatisticsPage() {
  const {
    isLoading: gamesLoading,
    ownedGames,
    statisticsHistory,
    isHistoryLoading,
    refreshHistory,
  } = useGameDataContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSnapshot = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    try {
      const finished = ownedGames.filter((game) => game.state === 'Finished').length;
      const putAside = ownedGames.filter((game) => game.state === 'Put Aside').length;
      const notYetPlayed = ownedGames
        .filter((game) => game.state === 'Not Yet Played').length;
      await createStatistic(finished, putAside, notYetPlayed);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate snapshot.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isPageLoading = gamesLoading || isHistoryLoading;
  const hasCurrentMonthSnapshot = statisticsHistory.length > 0
    && isCurrentMonth(statisticsHistory[0].date);
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Statistics
        </Typography>
        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AddchartIcon />}
          onClick={handleGenerateSnapshot}
          disabled={isGenerating || gamesLoading || isHistoryLoading || hasCurrentMonthSnapshot}
        >
          {isGenerating ? 'Saving…' : 'Generate Snapshot'}
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {bodyContent}
    </Box>
  );
}

export default StatisticsPage;
