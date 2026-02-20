import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { Store } from '../../types/entities';

interface StoreFormDialogProps {
  open: boolean;
  store?: Store;
  isOperating: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

function StoreFormDialog({
  open,
  store,
  isOperating,
  onClose,
  onSubmit,
}: StoreFormDialogProps) {
  const isEditing = store !== undefined;
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (open) {
      setName(store?.name ?? '');
      setNameError('');
    }
  }, [open, store]);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required.');
      return;
    }
    setNameError('');
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Store' : 'Add Store'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <TextField
          label="Store name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(nameError)}
          helperText={nameError}
          autoFocus
          disabled={isOperating}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
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

export default StoreFormDialog;
