import AddchartIcon from '@mui/icons-material/Addchart';
import {
  Alert,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { type ReactNode, useState } from 'react';

import { useAppContext } from '../context/AppContext';
import { useSheetDataContext } from '../context/SheetDataContext';
import { appendStatisticsEntry } from '../services/sheetsApi';
import type { StatisticsEntry } from '../types/entities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

interface DiffCellProps {
  value: number | null;
  isPercent?: boolean;
}

function DiffCell({ value, isPercent = false }: DiffCellProps) {
  if (value === null) {
    return <TableCell align="right">—</TableCell>;
  }
  let color = 'text.secondary';
  if (value > 0) color = 'success.main';
  if (value < 0) color = 'error.main';
  const prefix = value > 0 ? '+' : '';
  const display = isPercent
    ? `${prefix}${value.toFixed(1)}%`
    : `${prefix}${value}`;

  return (
    <TableCell align="right">
      <Typography variant="body2" component="span" color={color} fontWeight={600}>
        {display}
      </Typography>
    </TableCell>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function StatisticsPage() {
  const { state: appState, getToken } = useAppContext();
  const {
    ownedGames,
    isLoading: gamesLoading,
    statisticsHistory,
    isHistoryLoading,
    refreshHistory,
  } = useSheetDataContext();
  const spreadsheetId = appState.config?.spreadsheetId ?? '';

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Snapshot generation
  // ---------------------------------------------------------------------------

  const handleGenerateSnapshot = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();

      const finished = ownedGames.filter((g) => g.state === 'Finished').length;
      const putAside = ownedGames.filter((g) => g.state === 'Put Aside').length;
      const notYetPlayed = ownedGames.filter((g) => g.state === 'Not Yet Played').length;
      const total = ownedGames.length;
      const percentNotYetPlayed = total > 0
        ? Math.round((notYetPlayed / total) * 1000) / 10
        : 0;

      // Most recent stored snapshot is the last entry (chronological order)
      const prev = statisticsHistory.length > 0
        ? statisticsHistory[statisticsHistory.length - 1]
        : null;

      const entry: StatisticsEntry = {
        date: new Date().toISOString(),
        finished,
        diffFinished: prev !== null ? finished - prev.finished : null,
        putAside,
        diffPutAside: prev !== null ? putAside - prev.putAside : null,
        notYetPlayed,
        diffNotYetPlayed: prev !== null ? notYetPlayed - prev.notYetPlayed : null,
        total,
        percentNotYetPlayed,
        diffPercentNotYetPlayed: prev !== null
          ? Math.round((percentNotYetPlayed - prev.percentNotYetPlayed) * 10) / 10
          : null,
      };

      await appendStatisticsEntry(spreadsheetId, entry, token);
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
  // Display newest first
  const historyNewestFirst = [...statisticsHistory].reverse();

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
        No snapshots yet. Click
        {' '}
        <strong>Generate Current Snapshot</strong>
        {' '}
        to record the first entry.
      </Typography>
    );
  } else {
    bodyContent = (
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Finished</TableCell>
              <TableCell align="right">Δ Finished</TableCell>
              <TableCell align="right">Put Aside</TableCell>
              <TableCell align="right">Δ Put Aside</TableCell>
              <TableCell align="right">Not Yet Played</TableCell>
              <TableCell align="right">Δ Not Yet Played</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">% Not Yet Played</TableCell>
              <TableCell align="right">Δ %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historyNewestFirst.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={`${entry.date}-${index}`} hover>
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell align="right">{entry.finished}</TableCell>
                <DiffCell value={entry.diffFinished} />
                <TableCell align="right">{entry.putAside}</TableCell>
                <DiffCell value={entry.diffPutAside} />
                <TableCell align="right">{entry.notYetPlayed}</TableCell>
                <DiffCell value={entry.diffNotYetPlayed} />
                <TableCell align="right">{entry.total}</TableCell>
                <TableCell align="right">{formatPercent(entry.percentNotYetPlayed)}</TableCell>
                <DiffCell value={entry.diffPercentNotYetPlayed} isPercent />
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
        <Tooltip
          title={
            gamesLoading
              ? 'Waiting for game data to load…'
              : 'Record the current game counts as a new snapshot'
          }
        >
          <span>
            <Button
              variant="contained"
              startIcon={
                isGenerating
                  ? <CircularProgress size={16} color="inherit" />
                  : <AddchartIcon />
              }
              onClick={handleGenerateSnapshot}
              disabled={isGenerating || gamesLoading}
            >
              {isGenerating ? 'Saving…' : 'Generate Current Snapshot'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bodyContent}
    </Box>
  );
}

export default StatisticsPage;
