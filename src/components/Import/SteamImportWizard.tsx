import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { useSheetDataContext } from '../../context/SheetDataContext';
import { fetchOwnedGames, resolveSteamId } from '../../services/steamApi';
import {
  categorizeSteamGames,
} from '../../utils/fuzzyMatch';
import type { BucketAMatch, BucketBMatch, SteamGame } from '../../utils/fuzzyMatch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 'enter-url' | 'fetching' | 'conflict' | 'executing' | 'report';

interface ImportReport {
  totalFetched: number;
  newGamesAdded: number;
  autoMerged: number;
  manuallyResolved: number;
}

interface WizardState {
  step: WizardStep;
  steamUrl: string;
  urlError: string;
  totalFetched: number;
  bucketA: BucketAMatch[];
  bucketB: BucketBMatch[];
  bucketC: SteamGame[];
  executionProgress: number;
  report: ImportReport | null;
  error: string | null;
}

const INITIAL_STATE: WizardState = {
  step: 'enter-url',
  steamUrl: '',
  urlError: '',
  totalFetched: 0,
  bucketA: [],
  bucketB: [],
  bucketC: [],
  executionProgress: 0,
  report: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SteamImportWizardProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SteamImportWizard({ open, onClose }: SteamImportWizardProps) {
  const { state: appState } = useAppContext();
  const steamApiKey = appState.config?.steamApiKey ?? '';
  const { games, batchImport } = useSheetDataContext();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  // Reset all state whenever the dialog opens
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setState(INITIAL_STATE);
    }
    prevOpen.current = open;
  }, [open]);

  // ---------------------------------------------------------------------------
  // Execution (shared by auto-skip and manual "Continue")
  // ---------------------------------------------------------------------------

  const executeImport = async (params: {
    bucketA: BucketAMatch[];
    bucketB: BucketBMatch[];
    bucketC: SteamGame[];
    totalFetched: number;
  }): Promise<void> => {
    setState((prev) => ({
      ...prev, step: 'executing', executionProgress: 0, error: null,
    }));
    try {
      const toMergeManually = params.bucketB.filter((b) => b.decision === 'merge');
      const toImportAsNew: SteamGame[] = [
        ...params.bucketC,
        ...params.bucketB
          .filter((b) => b.decision === 'import-new')
          .map((b) => b.steamGame),
      ];

      const result = await batchImport(
        {
          toAutoMerge: params.bucketA,
          toMergeManually,
          toImportAsNew,
        },
        (pct) => setState((prev) => ({ ...prev, executionProgress: pct })),
      );

      const report: ImportReport = {
        totalFetched: params.totalFetched,
        newGamesAdded: result.newGamesAdded,
        autoMerged: result.autoMerged,
        manuallyResolved: params.bucketB.length,
      };

      setState((prev) => ({ ...prev, step: 'report', report }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        step: 'conflict',
        error: err instanceof Error ? err.message : 'Import failed. Please try again.',
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Fetch handler
  // ---------------------------------------------------------------------------

  const handleFetch = async (): Promise<void> => {
    const trimmed = state.steamUrl.trim();
    if (!trimmed) {
      setState((prev) => ({ ...prev, urlError: 'Please enter a Steam profile URL.' }));
      return;
    }

    if (!steamApiKey) {
      setState((prev) => ({
        ...prev,
        error: 'No Steam Web API Key configured. Open Settings (⚙) and add your key.',
      }));
      return;
    }

    setState((prev) => ({
      ...prev, step: 'fetching', urlError: '', error: null,
    }));
    try {
      const steamId = await resolveSteamId(trimmed);
      const ownedGames = await fetchOwnedGames(steamId, steamApiKey);

      const totalFetched = ownedGames.length;

      if (totalFetched === 0) {
        // Nothing fetched → show report with zeros
        setState((prev) => ({
          ...prev,
          step: 'report',
          totalFetched: 0,
          report: {
            totalFetched: 0, newGamesAdded: 0, autoMerged: 0, manuallyResolved: 0,
          },
        }));
        return;
      }

      const categorization = categorizeSteamGames(ownedGames, games);

      if (categorization.bucketB.length === 0) {
        // No conflicts — execute immediately
        await executeImport({ ...categorization, totalFetched });
      } else {
        setState((prev) => ({
          ...prev,
          totalFetched,
          bucketA: categorization.bucketA,
          bucketB: categorization.bucketB,
          bucketC: categorization.bucketC,
          step: 'conflict',
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        step: 'enter-url',
        error: err instanceof Error ? err.message : 'Failed to fetch Steam data.',
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Conflict resolution handlers
  // ---------------------------------------------------------------------------

  const handleDecisionChange = (appid: number, decision: 'merge' | 'import-new'): void => {
    setState((prev) => ({
      ...prev,
      bucketB: prev.bucketB.map((item) =>
        (item.steamGame.appid === appid ? { ...item, decision } : item)),
    }));
  };

  const handleContinue = async (): Promise<void> => {
    await executeImport({
      bucketA: state.bucketA,
      bucketB: state.bucketB,
      bucketC: state.bucketC,
      totalFetched: state.totalFetched,
    });
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const isBusy = state.step === 'fetching' || state.step === 'executing';

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  const renderEnterUrl = () => (
    <>
      <DialogTitle>Import from Steam</DialogTitle>
      <DialogContent sx={{
        display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important',
      }}
      >
        {state.error && (
          <Alert severity="error" onClose={() => setState((prev) => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          Enter your Steam profile URL to import your game library.
          Your profile and game details must be set to
          {' '}
          <strong>Public</strong>
          .
        </Typography>
        <TextField
          label="Steam Profile URL"
          placeholder="https://steamcommunity.com/profiles/76561198..."
          fullWidth
          autoFocus
          value={state.steamUrl}
          onChange={(e) => setState((prev) => ({ ...prev, steamUrl: e.target.value, urlError: '' }))}
          error={Boolean(state.urlError)}
          helperText={state.urlError || 'Accepts numeric profile URL or vanity URL (e.g. /id/username)'}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleFetch}>
          Fetch
        </Button>
      </DialogActions>
    </>
  );

  const renderFetching = () => (
    <>
      <DialogTitle>Import from Steam</DialogTitle>
      <DialogContent>
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4,
        }}
        >
          <CircularProgress />
          <Typography color="text.secondary">Fetching and analyzing your Steam library…</Typography>
        </Box>
      </DialogContent>
    </>
  );

  const renderConflict = () => (
    <>
      <DialogTitle>Resolve Conflicts</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setState((prev) => ({ ...prev, error: null }))}>
            {state.error}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These Steam games are similar to titles already in your library.
          Choose whether to
          {' '}
          <strong>Merge</strong>
          {' '}
          (add Steam as a store to the existing game)
          or
          {' '}
          <strong>Import as New</strong>
          {' '}
          (create a separate entry).
        </Typography>
        <Box sx={{
          mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap',
        }}
        >
          <Chip label={`${state.bucketA.length} auto-merged`} size="small" color="success" variant="outlined" />
          <Chip label={`${state.bucketB.length} to resolve`} size="small" color="warning" variant="outlined" />
          <Chip label={`${state.bucketC.length} new`} size="small" color="primary" variant="outlined" />
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Steam Game</TableCell>
                <TableCell sx={{ width: 80 }}>Match</TableCell>
                <TableCell>Existing in Library</TableCell>
                <TableCell sx={{ width: 240 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {state.bucketB.map((item) => (
                <TableRow key={item.steamGame.appid} hover>
                  <TableCell>{item.steamGame.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(item.score * 100)}
                      %
                    </Typography>
                  </TableCell>
                  <TableCell>{item.dbGame.title}</TableCell>
                  <TableCell>
                    <RadioGroup
                      row
                      value={item.decision}
                      onChange={(e) =>
                        handleDecisionChange(
                          item.steamGame.appid,
                          e.target.value as 'merge' | 'import-new',
                        )}
                    >
                      <FormControlLabel
                        value="merge"
                        control={<Radio size="small" />}
                        label="Merge"
                      />
                      <FormControlLabel
                        value="import-new"
                        control={<Radio size="small" />}
                        label="Import as New"
                      />
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleContinue}>
          Continue
        </Button>
      </DialogActions>
    </>
  );

  const renderExecuting = () => (
    <>
      <DialogTitle>Importing…</DialogTitle>
      <DialogContent>
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 2, py: 2,
        }}
        >
          <Typography color="text.secondary">
            Writing to your Google Sheet. Please wait…
          </Typography>
          <LinearProgress
            variant={state.executionProgress === 0 ? 'indeterminate' : 'determinate'}
            value={state.executionProgress}
          />
          {state.executionProgress > 0 && (
            <Typography variant="body2" color="text.secondary" align="right">
              {state.executionProgress}
              %
            </Typography>
          )}
        </Box>
      </DialogContent>
    </>
  );

  const renderReport = () => {
    const r = state.report!;
    return (
      <>
        <DialogTitle>Import Complete</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your Steam library has been imported successfully.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography>
              Total games fetched from Steam:
              {' '}
              <strong>{r.totalFetched}</strong>
            </Typography>
            <Typography>
              New games added:
              {' '}
              <strong>{r.newGamesAdded}</strong>
            </Typography>
            <Typography>
              Exact matches auto-merged:
              {' '}
              <strong>{r.autoMerged}</strong>
            </Typography>
            <Typography>
              Fuzzy matches resolved manually:
              {' '}
              <strong>{r.manuallyResolved}</strong>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        </DialogActions>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      disableEscapeKeyDown={isBusy}
      maxWidth="md"
      fullWidth
    >
      {state.step === 'enter-url' && renderEnterUrl()}
      {state.step === 'fetching' && renderFetching()}
      {state.step === 'conflict' && renderConflict()}
      {state.step === 'executing' && renderExecuting()}
      {state.step === 'report' && renderReport()}
    </Dialog>
  );
}

export default SteamImportWizard;
