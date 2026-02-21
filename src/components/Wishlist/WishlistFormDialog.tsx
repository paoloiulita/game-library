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
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { Game, Store } from '../../types/entities';

interface WishlistFormDialogProps {
  open: boolean;
  game?: Game;
  currentStoreIds?: string[];
  stores: Store[];
  isOperating: boolean;
  onClose: () => void;
  onSubmit: (title: string, storeIds: string[]) => Promise<void>;
}

function WishlistFormDialog({
  open,
  game,
  currentStoreIds = [],
  stores,
  isOperating,
  onClose,
  onSubmit,
}: WishlistFormDialogProps) {
  const isEditing = game !== undefined;
  const [title, setTitle] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(game?.title ?? '');
      setSelectedStoreIds(new Set(currentStoreIds));
      setTitleError('');
    }
  }, [open, game, currentStoreIds]);

  const handleStoreToggle = (storeId: string): void => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
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
    await onSubmit(trimmed, Array.from(selectedStoreIds));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Wishlist Item' : 'Add to Wishlist'}</DialogTitle>
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

        <FormControl component="fieldset" disabled={isOperating}>
          <FormLabel component="legend">Available at</FormLabel>
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

export default WishlistFormDialog;
