import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useSheetDataContext } from '../context/SheetDataContext';
import type { StatisticsEntry } from '../types/entities';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  Finished: '#2e7d32',
  'Put Aside': '#e65100',
  'Not Yet Played': '#757575',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatChartDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

// ---------------------------------------------------------------------------
// Sub-components — KPI
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

// ---------------------------------------------------------------------------
// Sub-components — Pie chart
// ---------------------------------------------------------------------------

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
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — Time-series charts
// ---------------------------------------------------------------------------

interface AreaSeriesChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  color: string;
}

function AreaSeriesChart({ title, data, color }: AreaSeriesChartProps) {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Paper>
  );
}

interface DeltaBarChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
}

function DeltaBarChart({ title, data }: DeltaBarChartProps) {
  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip />
          <ReferenceLine y={0} stroke="#9e9e9e" />
          <Bar dataKey="value">
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.value <= 0 ? '#2e7d32' : '#e65100'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Helper: build chart series from history (chronological order)
// ---------------------------------------------------------------------------

function buildHistoryCharts(history: StatisticsEntry[]) {
  const totalData = history.map((e) => ({ label: formatChartDate(e.date), value: e.total }));
  const backlogData = history.map((e) => ({
    label: formatChartDate(e.date), value: e.notYetPlayed,
  }));
  const deltaData = history
    .filter((e) => e.diffPercentNotYetPlayed !== null)
    .map((e) => ({ label: formatChartDate(e.date), value: e.diffPercentNotYetPlayed as number }));
  return { totalData, backlogData, deltaData };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const {
    ownedGames, isLoading, error, clearError, statisticsHistory,
  } = useSheetDataContext();

  const finished = ownedGames.filter((g) => g.state === 'Finished').length;
  const putAside = ownedGames.filter((g) => g.state === 'Put Aside').length;
  const notYetPlayed = ownedGames.filter((g) => g.state === 'Not Yet Played').length;
  const total = ownedGames.length;

  const globalData: ChartEntry[] = [
    { name: 'Finished', value: finished },
    { name: 'Put Aside', value: putAside },
    { name: 'Not Yet Played', value: notYetPlayed },
  ].filter((d) => d.value > 0);

  const completionData: ChartEntry[] = [
    { name: 'Finished', value: finished },
    { name: 'Put Aside', value: putAside },
  ].filter((d) => d.value > 0);

  const { totalData, backlogData, deltaData } = buildHistoryCharts(statisticsHistory);
  const hasHistory = statisticsHistory.length >= 2;

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

      {/* Time-series charts — visible once there are at least 2 snapshots */}
      {hasHistory && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 2, mt: 2,
        }}
        >
          <AreaSeriesChart
            title="Total Unique Games Over Time"
            data={totalData}
            color="#1565c0"
          />
          <AreaSeriesChart
            title="Backlog (Not Yet Played) Over Time"
            data={backlogData}
            color="#757575"
          />
          {deltaData.length >= 1 && (
            <DeltaBarChart
              title="Backlog Change Over Time (Δ % Not Yet Played)"
              data={deltaData}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

export default DashboardPage;
