import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { GAME_STATES } from '../../types/entities';
import type { Game, GameState, Store } from '../../types/entities';

interface GameFormDialogProps {
  open: boolean;
  game?: Game;
  currentStoreIds?: string[];
  stores: Store[];
  isOperating: boolean;
  onClose: () => void;
  onSubmit: (title: string, state: GameState, storeIds: string[]) => Promise<void>;
}

function GameFormDialog({
  open,
  game,
  currentStoreIds = [],
  stores,
  isOperating,
  onClose,
  onSubmit,
}: GameFormDialogProps) {
  const isEditing = game !== undefined;
  const [title, setTitle] = useState('');
  const [gameState, setGameState] = useState<GameState>('Not Yet Played');
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [titleError, setTitleError] = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (open) {
      setTitle(game?.title ?? '');
      setGameState(game?.state ?? 'Not Yet Played');
      setSelectedStoreIds(new Set(currentStoreIds));
      setTitleError('');
    }
  }, [open, game, currentStoreIds]);

  const handleStoreToggle = (storeId: string): void => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Title is required.');
      return;
    }
    setTitleError('');
    await onSubmit(trimmed, gameState, Array.from(selectedStoreIds));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Game' : 'Add Game'}</DialogTitle>
      <DialogContent sx={{
        display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important',
      }}
      >
        <TextField
          label="Title"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={Boolean(titleError)}
          helperText={titleError}
          autoFocus
          disabled={isOperating}
        />

        <FormControl fullWidth disabled={isOperating}>
          <InputLabel id="game-state-label">State</InputLabel>
          <Select
            labelId="game-state-label"
            value={gameState}
            label="State"
            onChange={(e) => setGameState(e.target.value as GameState)}
          >
            {GAME_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl component="fieldset" disabled={isOperating}>
          <FormLabel component="legend">Stores</FormLabel>
          {stores.length === 0 ? (
            <FormHelperText>No stores yet — add one on the Stores page.</FormHelperText>
          ) : (
            <FormGroup row>
              {stores.map((store) => (
                <FormControlLabel
                  key={store.id}
                  control={(
                    <Checkbox
                      checked={selectedStoreIds.has(store.id)}
                      onChange={() => handleStoreToggle(store.id)}
                    />
                  )}
                  label={store.name}
                />
              ))}
            </FormGroup>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isOperating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isOperating}
          startIcon={isOperating ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GameFormDialog;
