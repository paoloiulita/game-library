import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { extractSpreadsheetId } from '../../services/sheetsApi';
import type { AppConfig } from '../../types/entities';

interface SetupStep {
  label: 'configure' | 'signin';
}

function SetupModal() {
  const {
    state, isConfigured, saveConfig, signIn, clearError,
  } = useAppContext();

  const [step, setStep] = useState<SetupStep['label']>(
    isConfigured ? 'signin' : 'configure',
  );
  const [clientId, setClientId] = useState(state.config?.clientId ?? '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(
    state.config?.spreadsheetId ?? '',
  );
  const [steamApiKey, setSteamApiKey] = useState(state.config?.steamApiKey ?? '');

  const handleSaveConfig = (): void => {
    const config: AppConfig = {
      clientId: clientId.trim(),
      spreadsheetId: extractSpreadsheetId(spreadsheetUrl.trim()),
      steamApiKey: steamApiKey.trim() || undefined,
    };
    saveConfig(config);
    setStep('signin');
  };

  const handleSignIn = async (): Promise<void> => {
    await signIn();
  };

  const handleBackToConfig = (): void => {
    clearError();
    setStep('configure');
  };

  const isConfigFormValid = clientId.trim().length > 0 && spreadsheetUrl.trim().length > 0;

  return (
    <Dialog open maxWidth="sm" fullWidth disableEscapeKeyDown>
      {step === 'configure' && (
        <>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This app uses a Google Spreadsheet as its database. You need a
              Google Cloud project with the Sheets API enabled and an OAuth 2.0
              Client ID (Web application type).
              {' '}
              <Link
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
              >
                Open Google Cloud Console
              </Link>
            </Typography>
            <TextField
              label="OAuth 2.0 Client ID"
              fullWidth
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              margin="normal"
              helperText="Found in Google Cloud Console → APIs & Services → Credentials"
              autoFocus
            />
            <TextField
              label="Spreadsheet URL or ID"
              fullWidth
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              margin="normal"
              helperText="Paste the full URL or just the spreadsheet ID"
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Steam Import (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Required to import your Steam library. Steam no longer exposes
              game data in its public profile HTML, so a Web API Key is the
              only way to fetch it reliably.
              <Link
                href="https://steamcommunity.com/dev/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Get your Steam Web API Key
              </Link>
            </Typography>
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
            <Button
              variant="contained"
              onClick={handleSaveConfig}
              disabled={!isConfigFormValid}
            >
              Next: Sign In
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'signin' && (
        <>
          <DialogTitle>Sign In with Google</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click the button below to authenticate with Google and grant access
              to your spreadsheet. A popup window will open.
            </Typography>
            {state.error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                {state.error}
              </Alert>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Spreadsheet ID:</strong>
                {` ${state.config?.spreadsheetId}`}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBackToConfig} disabled={state.isSigningIn}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSignIn}
              disabled={state.isSigningIn}
              startIcon={
                state.isSigningIn ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {state.isSigningIn ? 'Signing in…' : 'Sign In with Google'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default SetupModal;
