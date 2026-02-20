import { useCallback, useEffect, useState } from 'react';

import { useAppContext } from '../context/AppContext';
import {
  createGame as apiCreateGame,
  createRelation,
  createStore as apiCreateStore,
  deleteGame as apiDeleteGame,
  deleteRelationsForGame,
  deleteRelationsForStore,
  deleteStore as apiDeleteStore,
  getGames,
  getRelations,
  getStores,
  updateGame as apiUpdateGame,
  updateStore as apiUpdateStore,
} from '../services/sheetsApi';
import type {
  Game, GameState, GameStoreRelation, Store,
} from '../types/entities';

interface SheetDataState {
  games: Game[];
  stores: Store[];
  relations: GameStoreRelation[];
  isLoading: boolean;
  isOperating: boolean;
  error: string | null;
}

export interface UseSheetDataReturn extends SheetDataState {
  /** Reload all data from the spreadsheet. */
  refresh: () => Promise<void>;
  /** Derived: store IDs associated with a game. */
  getStoreIdsForGame: (gameId: string) => string[];
  /** Derived: games that exist only on the given store (would become orphaned on deletion). */
  getGamesOnlyOnStore: (storeId: string) => Game[];
  createGame: (title: string, state: GameState, storeIds: string[]) => Promise<void>;
  updateGame: (game: Game, newStoreIds: string[]) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  createStore: (name: string) => Promise<void>;
  updateStore: (store: Store) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  clearError: () => void;
}

const initialState: SheetDataState = {
  games: [],
  stores: [],
  relations: [],
  isLoading: true,
  isOperating: false,
  error: null,
};

function useSheetData(): UseSheetDataReturn {
  const { state: appState, getToken } = useAppContext();
  const spreadsheetId = appState.config?.spreadsheetId ?? '';

  const [data, setData] = useState<SheetDataState>(initialState);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async (): Promise<void> => {
    if (!spreadsheetId) return;
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const token = await getToken();
      const [games, stores, relations] = await Promise.all([
        getGames(spreadsheetId, token),
        getStores(spreadsheetId, token),
        getRelations(spreadsheetId, token),
      ]);
      setData({
        games, stores, relations, isLoading: false, isOperating: false, error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load data.',
      }));
    }
  }, [spreadsheetId, getToken]);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      if (!spreadsheetId) return;
      try {
        const token = await getToken();
        const [games, stores, relations] = await Promise.all([
          getGames(spreadsheetId, token),
          getStores(spreadsheetId, token),
          getRelations(spreadsheetId, token),
        ]);
        if (active) {
          setData({
            games, stores, relations, isLoading: false, isOperating: false, error: null,
          });
        }
      } catch (err) {
        if (active) {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load data.',
          }));
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [spreadsheetId, getToken]);

  // ---------------------------------------------------------------------------
  // Helper: run an operation with loading state + error capture + auto-refresh
  // ---------------------------------------------------------------------------

  const operate = useCallback(
    async (fn: () => Promise<void>): Promise<void> => {
      setData((prev) => ({ ...prev, isOperating: true, error: null }));
      try {
        await fn();
        await refresh();
      } catch (err) {
        setData((prev) => ({
          ...prev,
          isOperating: false,
          error: err instanceof Error ? err.message : 'Operation failed.',
        }));
      }
    },
    [refresh],
  );

  // ---------------------------------------------------------------------------
  // Games CRUD
  // ---------------------------------------------------------------------------

  const createGame = useCallback(
    async (title: string, gameState: GameState, storeIds: string[]): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        const newGame: Game = {
          id: crypto.randomUUID(),
          title,
          state: gameState,
        };
        await apiCreateGame(spreadsheetId, newGame, token);
        await Promise.all(
          storeIds.map((storeId) =>
            createRelation(spreadsheetId, { gameId: newGame.id, storeId }, token)),
        );
      });
    },
    [spreadsheetId, getToken, operate],
  );

  const updateGame = useCallback(
    async (game: Game, newStoreIds: string[]): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        await apiUpdateGame(spreadsheetId, game, token);
        // Replace all relations: delete then re-create
        await deleteRelationsForGame(spreadsheetId, game.id, token);
        await Promise.all(
          newStoreIds.map((storeId) =>
            createRelation(spreadsheetId, { gameId: game.id, storeId }, token)),
        );
      });
    },
    [spreadsheetId, getToken, operate],
  );

  const deleteGame = useCallback(
    async (gameId: string): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        await deleteRelationsForGame(spreadsheetId, gameId, token);
        await apiDeleteGame(spreadsheetId, gameId, token);
      });
    },
    [spreadsheetId, getToken, operate],
  );

  // ---------------------------------------------------------------------------
  // Stores CRUD
  // ---------------------------------------------------------------------------

  const createStore = useCallback(
    async (name: string): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        const newStore: Store = { id: crypto.randomUUID(), name };
        await apiCreateStore(spreadsheetId, newStore, token);
      });
    },
    [spreadsheetId, getToken, operate],
  );

  const updateStore = useCallback(
    async (store: Store): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        await apiUpdateStore(spreadsheetId, store, token);
      });
    },
    [spreadsheetId, getToken, operate],
  );

  const deleteStore = useCallback(
    async (storeId: string): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        await deleteRelationsForStore(spreadsheetId, storeId, token);
        await apiDeleteStore(spreadsheetId, storeId, token);
      });
    },
    [spreadsheetId, getToken, operate],
  );

  // ---------------------------------------------------------------------------
  // Derived helpers
  // ---------------------------------------------------------------------------

  const getStoreIdsForGame = useCallback(
    (gameId: string): string[] =>
      data.relations.filter((r) => r.gameId === gameId).map((r) => r.storeId),
    [data.relations],
  );

  const getGamesOnlyOnStore = useCallback(
    (storeId: string): Game[] => {
      const gameIdsOnThisStore = new Set(
        data.relations.filter((r) => r.storeId === storeId).map((r) => r.gameId),
      );
      return data.games.filter((game) => {
        if (!gameIdsOnThisStore.has(game.id)) return false;
        const storeCount = data.relations.filter((r) => r.gameId === game.id).length;
        return storeCount === 1;
      });
    },
    [data.games, data.relations],
  );

  const clearError = useCallback((): void => {
    setData((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...data,
    refresh,
    getStoreIdsForGame,
    getGamesOnlyOnStore,
    createGame,
    updateGame,
    deleteGame,
    createStore,
    updateStore,
    deleteStore,
    clearError,
  };
}

export default useSheetData;
