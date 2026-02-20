import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { useSheetDataContext } from '../context/SheetDataContext';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  Finished: '#2e7d32',
  'Put Aside': '#e65100',
  'Not Yet Played': '#757575',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  title: string;
  value: number;
}

function KpiCard({ title, value }: KpiCardProps) {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        textAlign: 'center',
        flex: 1,
        minWidth: 180,
      }}
    >
      <Typography
        variant="h2"
        component="p"
        fontWeight={700}
        color="primary.main"
        lineHeight={1.1}
      >
        {value}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
    </Paper>
  );
}

interface ChartEntry {
  name: string;
  value: number;
}

interface PieLabelProps {
  percent?: number;
}

const renderPieLabel = ({ percent = 0 }: PieLabelProps): string =>
  (percent >= 0.05 ? `${(percent * 100).toFixed(1)}%` : '');

interface GamePieChartProps {
  title: string;
  data: ChartEntry[];
}

function GamePieChart({ title, data }: GamePieChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {isEmpty ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ py: 4, textAlign: 'center' }}
        >
          No data to display.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label={renderPieLabel}
              labelLine
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATE_COLORS[entry.name] ?? '#90a4ae'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const {
    games, isLoading, error, clearError,
  } = useSheetDataContext();

  const finished = games.filter((g) => g.state === 'Finished').length;
  const putAside = games.filter((g) => g.state === 'Put Aside').length;
  const notYetPlayed = games.filter((g) => g.state === 'Not Yet Played').length;
  const total = games.length;

  const globalData: ChartEntry[] = [
    { name: 'Finished', value: finished },
    { name: 'Put Aside', value: putAside },
    { name: 'Not Yet Played', value: notYetPlayed },
  ].filter((d) => d.value > 0);

  const completionData: ChartEntry[] = [
    { name: 'Finished', value: finished },
    { name: 'Put Aside', value: putAside },
  ].filter((d) => d.value > 0);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Box sx={{
        display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4,
      }}
      >
        <KpiCard title="Total Unique Games" value={total} />
        <KpiCard title="Backlog (Not Yet Played)" value={notYetPlayed} />
      </Box>

      {/* Pie Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <GamePieChart title="Global State Distribution" data={globalData} />
        <GamePieChart
          title="Completion Distribution (excl. Not Yet Played)"
          data={completionData}
        />
      </Box>
    </Box>
  );
}

export default DashboardPage;
