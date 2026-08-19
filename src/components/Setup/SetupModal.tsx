import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import type { AppConfig } from '../../types/entities';

function SetupModal() {
  const {
    state, saveConfig, signIn, clearError,
  } = useAppContext();

  const [steamApiKey, setSteamApiKey] = useState(state.config?.steamApiKey ?? '');

  const handleSaveConfig = (): void => {
    const config: AppConfig = { steamApiKey: steamApiKey.trim() || undefined };
    saveConfig(config);
  };

  const handleSignIn = async (): Promise<void> => {
    await signIn();
  };

  return (
    <Dialog open maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>Sign in to Game Library</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in with Google to access your personal game library.
        </Typography>
        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {state.error}
          </Alert>
        )}
        <TextField
          label="Steam Web API Key"
          fullWidth
          value={steamApiKey}
          onChange={(e) => setSteamApiKey(e.target.value)}
          margin="normal"
          helperText="Optional — only needed for Steam import"
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={handleSaveConfig}>
          Save Steam Key
        </Button>
        <Button
          variant="contained"
          onClick={handleSignIn}
          disabled={state.isSigningIn}
          startIcon={
            state.isSigningIn ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {state.isSigningIn ? 'Redirecting…' : 'Sign In with Google'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SetupModal;
