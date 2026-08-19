import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  type Theme,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';

import GameFormDialog from '../components/Games/GameFormDialog';
import { useGameDataContext } from '../context/GameDataContext';
import { type Game, type GameState } from '../types/entities';

const LETTERS = [
  'Other',
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
];

const getLetterGroup = (title: string): string => {
  const ch = title.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : 'Other';
};

const STATE_COLORS: Record<Game['state'], 'success' | 'warning' | 'default'> = {
  Finished: 'success',
  'Put Aside': 'warning',
  'Not Yet Played': 'default',
};

function GamesPage() {
  const {
    ownedGames,
    stores,
    isLoading,
    isOperating,
    error,
    getStoreIdsForGame,
    createGame,
    updateGame,
    deleteGame,
    clearError,
  } = useGameDataContext();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Game | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>('A');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [selectedStates, setSelectedStates] = useState<Set<Game['state']>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const isSearching = searchQuery.length >= 3;

  const availableLetters = useMemo(
    () => new Set(ownedGames.map((g) => getLetterGroup(g.title))),
    [ownedGames],
  );

  const filteredGames = useMemo(() => {
    let games = ownedGames;

    // Apply search filter
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      games = games.filter((g) => g.title.toLowerCase().includes(q));
    } else {
      // Apply letter filter only when not searching
      games = activeLetter
        ? games.filter((g) => getLetterGroup(g.title) === activeLetter)
        : games;
    }

    // Apply state filter
    if (selectedStates.size > 0) {
      games = games.filter((g) => selectedStates.has(g.state));
    }

    // Apply store filter
    if (selectedStores.size > 0) {
      games = games.filter((g) => {
        const gameStoreIds = getStoreIdsForGame(g.id);
        return gameStoreIds.some((sid) => selectedStores.has(sid));
      });
    }

    return games;
  }, [
    ownedGames,
    activeLetter,
    searchQuery,
    isSearching,
    selectedStores,
    selectedStates,
    getStoreIdsForGame,
  ]);

  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    if (value.length >= 3) setActiveLetter(null);
    else setActiveLetter('A');
  };

  const handleClearSearch = (): void => {
    setSearchQuery('');
    setActiveLetter('A');
  };

  const toggleStoreFilter = (storeId: string): void => {
    const newStores = new Set(selectedStores);
    if (newStores.has(storeId)) {
      newStores.delete(storeId);
    } else {
      newStores.add(storeId);
    }
    setSelectedStores(newStores);
  };

  const toggleStateFilter = (state: Game['state']): void => {
    const newStates = new Set(selectedStates);
    if (newStates.has(state)) {
      newStates.delete(state);
    } else {
      newStates.add(state);
    }
    setSelectedStates(newStates);
  };

  const clearAllFilters = (): void => {
    setSelectedStores(new Set());
    setSelectedStates(new Set());
  };

  const activeFilterCount = selectedStores.size + selectedStates.size + (activeLetter ? 1 : 0);

  const handleAddSubmit = async (title: string, state: Game['state'], storeIds: string[]): Promise<void> => {
    await createGame(title, state, storeIds);
    if (!error) setAddOpen(false);
  };

  const handleEditSubmit = async (title: string, state: Game['state'], storeIds: string[]): Promise<void> => {
    if (!editTarget) return;
    await updateGame({ ...editTarget, title, state }, storeIds);
    if (!error) setEditTarget(null);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    await deleteGame(deleteTarget.id);
    if (!error) setDeleteTarget(null);
  };

  const getStoreName = (storeId: string): string =>
    stores.find((s) => s.id === storeId)?.name ?? storeId;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const getCircleColor = (gameState: GameState, theme: Theme) => {
    if (gameState === 'Finished') {
      return theme.palette.success.main;
    }
    if (gameState === 'Put Aside') {
      return theme.palette.warning.main;
    }
    return theme.palette.grey[500];
  };

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        mb: 2,
      }}
      >
        <Typography variant="h5" fontWeight={600}>
          Games
        </Typography>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 1,
          width: { xs: '100%', md: 'auto' },
        }}
        >
          <TextField
            size="small"
            placeholder="Search games…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ width: { xs: '100%', md: 220 } }}
            slotProps={{
              input: {
                endAdornment: searchQuery.length > 0 && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            disabled={isOperating}
            sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}
          >
            Add Game
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {ownedGames.length > 0 && isMobile && (
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          endIcon={<ExpandMoreIcon sx={{ transform: mobileFiltersOpen ? 'rotate(180deg)' : 'none' }} />}
          onClick={() => setMobileFiltersOpen((open) => !open)}
          fullWidth
          sx={{ justifyContent: 'space-between', mb: 1.5 }}
        >
          Filters
          {activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
        </Button>
      )}

      <Box sx={{ display: { xs: mobileFiltersOpen ? 'block' : 'none', md: 'block' } }}>
        {/* Filters */}
        {ownedGames.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {/* State Filter */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                State
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {Object.keys(STATE_COLORS).map((state) => (
                  <Chip
                    key={state}
                    label={state}
                    onClick={() => toggleStateFilter(state as Game['state'])}
                    variant={selectedStates.has(state as Game['state']) ? 'filled' : 'outlined'}
                    color={selectedStates.has(state as Game['state']) ? STATE_COLORS[state as Game['state']] : 'default'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Store Filter */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Store
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {stores.map((store) => (
                  <Chip
                    key={store.id}
                    label={store.name}
                    onClick={() => toggleStoreFilter(store.id)}
                    variant={selectedStores.has(store.id) ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Clear Filters */}
            {(selectedStores.size > 0 || selectedStates.size > 0) && (
            <Button
              size="small"
              onClick={clearAllFilters}
              sx={{ mb: 1 }}
            >
              Clear Filters
            </Button>
            )}
          </Box>
        )}

        {/* Alphabetical index */}
        {ownedGames.length > 0 && (
          <Box sx={{
            display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2,
          }}
          >
            <Button
              size="small"
              variant={activeLetter === null ? 'contained' : 'outlined'}
              onClick={() => setActiveLetter(null)}
              disabled={isSearching}
              sx={{ minWidth: 36, px: 1 }}
            >
              *
            </Button>
            {LETTERS.map((letter) => (
              <Button
                key={letter}
                size="small"
                variant={activeLetter === letter ? 'contained' : 'outlined'}
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                disabled={isSearching || !availableLetters.has(letter)}
                sx={{ minWidth: 36, px: 1 }}
              >
                {letter}
              </Button>
            ))}
          </Box>
        )}
      </Box>

      {ownedGames.length === 0 ? (
        <Typography color="text.secondary">No games yet. Add your first game!</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ width: '100%', overflowX: { xs: 'hidden', md: 'auto' } }}>
          <Table sx={{ width: '100%', tableLayout: { xs: 'fixed', md: 'auto' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: { xs: '42%', md: 'auto' }, px: { xs: 1, md: 2 } }}>
                  Title
                </TableCell>
                <TableCell sx={{ width: { xs: '12%', md: 'auto' }, px: { xs: 1, md: 2 } }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>State</Box>
                </TableCell>
                <TableCell sx={{ width: { xs: '26%', md: 'auto' }, px: { xs: 1, md: 2 } }}>
                  Stores
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ width: { xs: '20%', md: 'auto' }, px: { xs: 1, md: 2 } }}
                >
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>Actions</Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGames.map((game) => {
                const storeIds = getStoreIdsForGame(game.id);
                return (
                  <TableRow key={game.id} hover>
                    <TableCell
                      sx={{ px: { xs: 1, md: 2 }, overflowWrap: 'anywhere' }}
                    >
                      {game.title}
                    </TableCell>
                    <TableCell sx={{ px: { xs: 1, md: 2 } }}>
                      {isMobile ? (
                        <Tooltip title={game.state}>
                          <Box
                            component="span"
                            role="img"
                            aria-label={game.state}
                            sx={(theme) => ({
                              display: 'inline-block',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: getCircleColor(game.state, theme),
                              verticalAlign: 'middle',
                            })}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label={game.state}
                          color={STATE_COLORS[game.state]}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ px: { xs: 1, md: 2 }, overflow: 'hidden' }}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {storeIds.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          storeIds.map((sid) => (
                            <Chip
                              key={sid}
                              label={getStoreName(sid)}
                              size="small"
                              variant="outlined"
                              sx={{ maxWidth: '100%' }}
                            />
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ px: { xs: 0.5, md: 2 }, whiteSpace: 'nowrap' }}
                    >
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          sx={{ p: { xs: 0.5, md: 1 } }}
                          onClick={() => setEditTarget(game)}
                          disabled={isOperating}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          sx={{ p: { xs: 0.5, md: 1 } }}
                          onClick={() => setDeleteTarget(game)}
                          disabled={isOperating}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add dialog */}
      <GameFormDialog
        open={addOpen}
        stores={stores}
        isOperating={isOperating}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {/* Edit dialog */}
      {editTarget && (
        <GameFormDialog
          open={Boolean(editTarget)}
          game={editTarget}
          currentStoreIds={getStoreIdsForGame(editTarget.id)}
          stores={stores}
          isOperating={isOperating}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete Game</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={isOperating}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={isOperating}
            startIcon={isOperating ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GamesPage;
