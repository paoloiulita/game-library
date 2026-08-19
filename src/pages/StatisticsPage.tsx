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
  const {
    isLoading: gamesLoading,
    statisticsHistory,
    isHistoryLoading,
  } = useGameDataContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Snapshot generation
  // ---------------------------------------------------------------------------

  const handleGenerateSnapshot = async (): Promise<void> => {
    setIsGenerating(false);
    setError('Statistics snapshots are temporarily unavailable.');
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
