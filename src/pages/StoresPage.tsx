import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import { useState } from 'react';

import DeleteStoreDialog from '../components/Stores/DeleteStoreDialog';
import StoreFormDialog from '../components/Stores/StoreFormDialog';
import { useSheetDataContext } from '../context/SheetDataContext';
import type { Store } from '../types/entities';

function StoresPage() {
  const {
    stores,
    relations,
    isLoading,
    isOperating,
    error,
    getGamesOnlyOnStore,
    createStore,
    updateStore,
    deleteStore,
    clearError,
  } = useSheetDataContext();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const getGameCount = (storeId: string): number =>
    relations.filter((r) => r.storeId === storeId).length;

  const handleAddSubmit = async (name: string): Promise<void> => {
    await createStore(name);
    if (!error) setAddOpen(false);
  };

  const handleEditSubmit = async (name: string): Promise<void> => {
    if (!editTarget) return;
    await updateStore({ ...editTarget, name });
    if (!error) setEditTarget(null);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;
    await deleteStore(deleteTarget.id);
    if (!error) setDeleteTarget(null);
  };

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
          Stores
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          disabled={isOperating}
        >
          Add Store
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stores.length === 0 ? (
        <Typography color="text.secondary">No stores yet. Add your first store!</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Games</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id} hover>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{getGameCount(store.id)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => setEditTarget(store)}
                        disabled={isOperating}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(store)}
                        disabled={isOperating}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add dialog */}
      <StoreFormDialog
        open={addOpen}
        isOperating={isOperating}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      {/* Edit dialog */}
      {editTarget && (
        <StoreFormDialog
          open={Boolean(editTarget)}
          store={editTarget}
          isOperating={isOperating}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Delete dialog with orphan warning */}
      {deleteTarget && (
        <DeleteStoreDialog
          open={Boolean(deleteTarget)}
          store={deleteTarget}
          orphanedGames={getGamesOnlyOnStore(deleteTarget.id)}
          isOperating={isOperating}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

    </Box>
  );
}

export default StoresPage;
