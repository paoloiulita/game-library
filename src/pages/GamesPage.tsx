import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
import { useMemo, useState } from 'react';

import GameFormDialog from '../components/Games/GameFormDialog';
import { useSheetDataContext } from '../context/SheetDataContext';
import type { Game } from '../types/entities';

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
    games,
    stores,
    isLoading,
    isOperating,
    error,
    getStoreIdsForGame,
    createGame,
    updateGame,
    deleteGame,
    clearError,
  } = useSheetDataContext();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Game | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>('A');

  const availableLetters = useMemo(
    () => new Set(games.map((g) => getLetterGroup(g.title))),
    [games],
  );

  const filteredGames = useMemo(
    () => (activeLetter ? games.filter((g) => getLetterGroup(g.title) === activeLetter) : games),
    [games, activeLetter],
  );

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

  return (
    <Box>
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2,
      }}
      >
        <Typography variant="h5" fontWeight={600}>
          Games
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          disabled={isOperating}
        >
          Add Game
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Alphabetical index */}
      {games.length > 0 && (
        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2,
        }}
        >
          <Button
            size="small"
            variant={activeLetter === null ? 'contained' : 'outlined'}
            onClick={() => setActiveLetter(null)}
            sx={{ minWidth: 52, px: 1 }}
          >
            See All
          </Button>
          {LETTERS.map((letter) => (
            <Button
              key={letter}
              size="small"
              variant={activeLetter === letter ? 'contained' : 'outlined'}
              onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
              disabled={!availableLetters.has(letter)}
              sx={{ minWidth: 36, px: 1 }}
            >
              {letter}
            </Button>
          ))}
        </Box>
      )}

      {games.length === 0 ? (
        <Typography color="text.secondary">No games yet. Add your first game!</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Stores</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGames.map((game) => {
                const storeIds = getStoreIdsForGame(game.id);
                return (
                  <TableRow key={game.id} hover>
                    <TableCell>{game.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={game.state}
                        color={STATE_COLORS[game.state]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {storeIds.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : (
                          storeIds.map((sid) => (
                            <Chip key={sid} label={getStoreName(sid)} size="small" variant="outlined" />
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
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
