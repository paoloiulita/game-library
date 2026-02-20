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
import {
  type ReactNode, useCallback, useEffect, useState,
} from 'react';

import { useAppContext } from '../context/AppContext';
import useSheetData from '../hooks/useSheetData';
import {
  appendStatisticsEntry,
  getStatisticsHistory,
} from '../services/sheetsApi';
import type { StatisticsEntry } from '../types/entities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
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
  const { games, isLoading: gamesLoading } = useSheetData();
  const spreadsheetId = appState.config?.spreadsheetId ?? '';

  const [history, setHistory] = useState<StatisticsEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load history
  // ---------------------------------------------------------------------------

  const loadHistory = useCallback(async (): Promise<void> => {
    if (!spreadsheetId) return;
    try {
      const token = await getToken();
      const entries = await getStatisticsHistory(spreadsheetId, token);
      // Reverse so newest is at the top of the table
      setHistory([...entries].reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [spreadsheetId, getToken]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ---------------------------------------------------------------------------
  // Snapshot generation
  // ---------------------------------------------------------------------------

  const handleGenerateSnapshot = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();

      const finished = games.filter((g) => g.state === 'Finished').length;
      const putAside = games.filter((g) => g.state === 'Put Aside').length;
      const notYetPlayed = games.filter((g) => g.state === 'Not Yet Played').length;
      const total = games.length;
      const percentNotYetPlayed = total > 0
        ? Math.round((notYetPlayed / total) * 1000) / 10 // 1 decimal
        : 0;

      // The "previous" entry is the most recent stored snapshot (top of the
      // reversed array = index 0)
      const prev = history[0] ?? null;

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
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate snapshot.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isPageLoading = gamesLoading || historyLoading;

  let bodyContent: ReactNode;
  if (isPageLoading) {
    bodyContent = (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  } else if (history.length === 0) {
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
            {history.map((entry, index) => (
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
