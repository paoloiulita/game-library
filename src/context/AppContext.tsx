import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

import { STORAGE_KEYS } from '../config/sheets';
import { requestAccessToken, revokeAccessToken } from '../services/googleAuth';
import type { AppConfig } from '../types/entities';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface AuthToken {
  token: string;
  expiry: number; // ms since epoch
}

interface AppState {
  config: AppConfig | null;
  auth: AuthToken | null;
  isSigningIn: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SAVE_CONFIG'; payload: AppConfig }
  | { type: 'SET_AUTH'; payload: AuthToken }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_SIGNING_IN'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const loadConfigFromStorage = (): AppConfig | null => {
  const clientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
  const spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID);
  if (clientId && spreadsheetId) {
    const steamApiKey = localStorage.getItem(STORAGE_KEYS.STEAM_API_KEY) ?? undefined;
    return { clientId, spreadsheetId, steamApiKey };
  }
  return null;
};

const loadAuthFromStorage = (): AuthToken | null => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const expiry = localStorage.getItem(STORAGE_KEYS.AUTH_EXPIRY);
  if (token && expiry && Date.now() < Number(expiry)) {
    return { token, expiry: Number(expiry) };
  }
  return null;
};

const initialState: AppState = {
  config: loadConfigFromStorage(),
  auth: loadAuthFromStorage(),
  isSigningIn: false,
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SAVE_CONFIG':
      return { ...state, config: action.payload, error: null };
    case 'SET_AUTH':
      return {
        ...state, auth: action.payload, isSigningIn: false, error: null,
      };
    case 'CLEAR_AUTH':
      return { ...state, auth: null };
    case 'SET_SIGNING_IN':
      return { ...state, isSigningIn: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isSigningIn: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: AppState;
  isConfigured: boolean;
  isAuthenticated: boolean;
  saveConfig: (config: AppConfig) => void;
  signIn: () => Promise<void>;
  signOut: () => void;
  /** Returns a valid access token, requesting a new one if the current has expired. */
  getToken: () => Promise<string>;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AppProviderProps {
  children: ReactNode;
}

function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const saveConfig = useCallback((config: AppConfig): void => {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, config.clientId);
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, config.spreadsheetId);
    if (config.steamApiKey) {
      localStorage.setItem(STORAGE_KEYS.STEAM_API_KEY, config.steamApiKey);
    } else {
      localStorage.removeItem(STORAGE_KEYS.STEAM_API_KEY);
    }
    dispatch({ type: 'SAVE_CONFIG', payload: config });
  }, []);

  const signIn = useCallback(async (): Promise<void> => {
    if (!state.config) {
      dispatch({ type: 'SET_ERROR', payload: 'No configuration found. Please set up the app first.' });
      return;
    }
    dispatch({ type: 'SET_SIGNING_IN', payload: true });
    try {
      const authToken = await requestAccessToken(state.config.clientId);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken.token);
      localStorage.setItem(STORAGE_KEYS.AUTH_EXPIRY, String(authToken.expiry));
      dispatch({ type: 'SET_AUTH', payload: authToken });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Authentication failed.',
      });
    }
  }, [state.config]);

  const signOut = useCallback((): void => {
    if (state.auth) {
      revokeAccessToken(state.auth.token);
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_EXPIRY);
    dispatch({ type: 'CLEAR_AUTH' });
  }, [state.auth]);

  const getToken = useCallback(async (): Promise<string> => {
    if (state.auth && Date.now() < state.auth.expiry) {
      return state.auth.token;
    }
    // Token expired – request a new one (requires user interaction)
    if (!state.config) throw new Error('Not configured.');
    const authToken = await requestAccessToken(state.config.clientId);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authToken.token);
    localStorage.setItem(STORAGE_KEYS.AUTH_EXPIRY, String(authToken.expiry));
    dispatch({ type: 'SET_AUTH', payload: authToken });
    return authToken.token;
  }, [state.auth, state.config]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      isConfigured: state.config !== null,
      isAuthenticated: state.auth !== null,
      saveConfig,
      signIn,
      signOut,
      getToken,
      clearError,
    }),
    [state, saveConfig, signIn, signOut, getToken, clearError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider.');
  return ctx;
}

export default AppProvider;
