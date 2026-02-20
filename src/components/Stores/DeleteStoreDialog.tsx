import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

import type { Game, Store } from '../../types/entities';

interface DeleteStoreDialogProps {
  open: boolean;
  store: Store;
  /** Games that will become unassigned if this store is deleted. */
  orphanedGames: Game[];
  isOperating: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteStoreDialog({
  open,
  store,
  orphanedGames,
  isOperating,
  onClose,
  onConfirm,
}: DeleteStoreDialogProps) {
  const hasOrphans = orphanedGames.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Store</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`Are you sure you want to delete the store "${store.name}"?`}
        </DialogContentText>

        {hasOrphans && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {`The following ${orphanedGames.length === 1 ? 'game exists' : 'games exist'} only on this store and will become unassigned:`}
            <List dense disablePadding sx={{ mt: 1 }}>
              {orphanedGames.map((game) => (
                <ListItem key={game.id} disablePadding sx={{ pl: 1 }}>
                  <ListItemText
                    primary={game.title}
                    secondary={game.state}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isOperating}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={isOperating}
          startIcon={isOperating ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {hasOrphans ? 'Delete anyway' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteStoreDialog;
