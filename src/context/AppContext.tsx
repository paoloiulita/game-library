import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useEffect,
} from 'react';

import STORAGE_KEYS from '../config/storage';
import {
  getSession, onAuthStateChange, signInWithGoogle, signOut as supabaseSignOut,
} from '../services/supabaseAuth';
import type { AppConfig } from '../types/entities';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface AppState {
  config: AppConfig | null;
  auth: import('@supabase/supabase-js').Session | null;
  isAuthLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SAVE_CONFIG'; payload: AppConfig }
  | { type: 'SET_AUTH'; payload: AppState['auth'] }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_SIGNING_IN'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const loadConfigFromStorage = (): AppConfig | null => {
  const steamApiKey = localStorage.getItem(STORAGE_KEYS.STEAM_API_KEY) ?? undefined;
  return steamApiKey ? { steamApiKey } : null;
};

const initialState: AppState = {
  config: loadConfigFromStorage(),
  auth: null,
  isAuthLoading: true,
  isSigningIn: false,
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SAVE_CONFIG':
      return { ...state, config: action.payload, error: null };
    case 'SET_AUTH':
      return {
        ...state,
        auth: action.payload,
        isAuthLoading: false,
        isSigningIn: false,
        error: null,
      };
    case 'CLEAR_AUTH':
      return { ...state, auth: null };
    case 'SET_SIGNING_IN':
      return { ...state, isSigningIn: action.payload, error: null };
    case 'SET_ERROR':
      return {
        ...state, error: action.payload, isAuthLoading: false, isSigningIn: false,
      };
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
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  saveConfig: (config: AppConfig) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) => {
        if (active) dispatch({ type: 'SET_AUTH', payload: session });
      })
      .catch((err: unknown) => {
        if (active) {
          dispatch({
            type: 'SET_ERROR',
            payload: err instanceof Error ? err.message : 'Failed to restore session.',
          });
        }
      });

    const unsubscribe = onAuthStateChange((session) => {
      if (active) dispatch({ type: 'SET_AUTH', payload: session });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const saveConfig = useCallback((config: AppConfig): void => {
    if (config.steamApiKey) {
      localStorage.setItem(STORAGE_KEYS.STEAM_API_KEY, config.steamApiKey);
    } else {
      localStorage.removeItem(STORAGE_KEYS.STEAM_API_KEY);
    }
    dispatch({ type: 'SAVE_CONFIG', payload: config });
  }, []);

  const signIn = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_SIGNING_IN', payload: true });
    try {
      await signInWithGoogle();
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err instanceof Error ? err.message : 'Authentication failed.',
      });
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabaseSignOut();
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      isAuthenticated: state.auth !== null,
      isAuthLoading: state.isAuthLoading,
      saveConfig,
      signIn,
      signOut,
      clearError,
    }),
    [state, saveConfig, signIn, signOut, clearError],
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
