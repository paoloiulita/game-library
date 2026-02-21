import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { Game, Store } from '../../types/entities';

interface MarkAsBoughtDialogProps {
  open: boolean;
  game: Game | null;
  currentStoreIds: string[];
  stores: Store[];
  isOperating: boolean;
  onClose: () => void;
  onConfirm: (purchasedStoreIds: string[]) => Promise<void>;
}

function MarkAsBoughtDialog({
  open,
  game,
  currentStoreIds,
  stores,
  isOperating,
  onClose,
  onConfirm,
}: MarkAsBoughtDialogProps) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [selectionError, setSelectionError] = useState('');

  const relevantStores = stores.filter((s) => currentStoreIds.includes(s.id));

  useEffect(() => {
    if (open) {
      setSelectedStoreIds(new Set());
      setSelectionError('');
    }
  }, [open]);

  const handleStoreToggle = (storeId: string): void => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const handleConfirm = async (): Promise<void> => {
    if (relevantStores.length > 0 && selectedStoreIds.size === 0) {
      setSelectionError('Please select at least one store.');
      return;
    }
    setSelectionError('');
    await onConfirm(Array.from(selectedStoreIds));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark as Bought</DialogTitle>
      <DialogContent sx={{
        display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important',
      }}
      >
        <DialogContentText>
          {`Where did you buy "${game?.title ?? ''}"?`}
        </DialogContentText>

        {relevantStores.length > 0 ? (
          <FormControl
            component="fieldset"
            disabled={isOperating}
            error={Boolean(selectionError)}
          >
            <FormLabel component="legend">Purchased from</FormLabel>
            <FormGroup>
              {relevantStores.map((store) => (
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
            {selectionError && <FormHelperText>{selectionError}</FormHelperText>}
          </FormControl>
        ) : (
          <DialogContentText variant="body2" color="text.secondary">
            No stores are linked to this item — it will be added to your library directly.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isOperating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={isOperating}
          startIcon={
            isOperating
              ? <CircularProgress size={16} color="inherit" />
              : <ShoppingCartCheckoutIcon />
          }
        >
          Confirm Purchase
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MarkAsBoughtDialog;
