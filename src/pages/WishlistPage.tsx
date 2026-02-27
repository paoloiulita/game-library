import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
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
} from '@mui/material';
import { useMemo, useState } from 'react';

import MarkAsBoughtDialog from '../components/Wishlist/MarkAsBoughtDialog';
import WishlistFormDialog from '../components/Wishlist/WishlistFormDialog';
import { useSheetDataContext } from '../context/SheetDataContext';
import type { Game } from '../types/entities';

function WishlistPage() {
  const {
    wishlistGames,
    stores,
    isLoading,
    isOperating,
    error,
    getStoreIdsForGame,
    createWishlistGame,
    updateGame,
    deleteGame,
    markAsBought,
    clearError,
  } = useSheetDataContext();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Game | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [buyTarget, setBuyTarget] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = useMemo(() => {
    if (!searchQuery) return wishlistGames;
    const q = searchQuery.toLowerCase();
    return wishlistGames.filter((g) => g.title.toLowerCase().includes(q));
  }, [wishlistGames, searchQuery]);

  const handleAddSubmit = async (title: string, storeIds: string[]): Promise<void> => {
    await createWishlistGame(title, storeIds);
    if (!error) setAddOpen(false);
  };

  const handleEditSubmit = async (title: string, storeIds: string[]): Promise<void> => {
    if (!editTarget) return;
    await updateGame({ ...editTarget, title }, storeIds);
    if (!error) setEditTarget(null);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    await deleteGame(deleteTarget.id);
    if (!error) setDeleteTarget(null);
  };

  const handleBuyConfirm = async (purchasedStoreIds: string[]): Promise<void> => {
    if (!buyTarget) return;
    await markAsBought(buyTarget.id, purchasedStoreIds);
    if (!error) setBuyTarget(null);
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
      {/* Sticky page header */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.default',
        mt: -3,
        pt: 3,
        pb: 1,
      }}
      >
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2,
        }}
        >
          <Typography variant="h5" fontWeight={600}>
            Wishlist
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search wishlist…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 220 }}
              slotProps={{
                input: {
                  endAdornment: searchQuery.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
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
            >
              Add to Wishlist
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {wishlistGames.length === 0 ? (
        <Typography color="text.secondary">
          Your wishlist is empty. Add a game you want to buy!
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Available at</TableCell>
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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {storeIds.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        ) : (
                          storeIds.map((sid) => (
                            <Chip key={sid} label={getStoreName(sid)} size="small" variant="outlined" />
                          ))
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Mark as Bought">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => setBuyTarget(game)}
                          disabled={isOperating}
                        >
                          <ShoppingCartCheckoutIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
      <WishlistFormDialog
        open={addOpen}
        stores={stores}
        isOperating={isOperating}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {/* Edit dialog */}
      {editTarget && (
        <WishlistFormDialog
          open={Boolean(editTarget)}
          game={editTarget}
          currentStoreIds={getStoreIdsForGame(editTarget.id)}
          stores={stores}
          isOperating={isOperating}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Mark as Bought dialog */}
      <MarkAsBoughtDialog
        open={Boolean(buyTarget)}
        game={buyTarget}
        currentStoreIds={buyTarget ? getStoreIdsForGame(buyTarget.id) : []}
        stores={stores}
        isOperating={isOperating}
        onClose={() => setBuyTarget(null)}
        onConfirm={handleBuyConfirm}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Remove from Wishlist</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`Are you sure you want to remove "${deleteTarget?.title}" from your wishlist? This action cannot be undone.`}
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
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WishlistPage;
