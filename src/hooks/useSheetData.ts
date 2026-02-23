import {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import { useAppContext } from '../context/AppContext';
import {
  createGame as apiCreateGame,
  createGames as apiCreateGames,
  createRelation,
  createRelations as apiCreateRelations,
  createStore as apiCreateStore,
  deleteGame as apiDeleteGame,
  deleteRelationsForGame,
  deleteRelationsForStore,
  deleteStore as apiDeleteStore,
  getGames,
  getRelations,
  getStatisticsHistory,
  getStores,
  updateGame as apiUpdateGame,
  updateStore as apiUpdateStore,
} from '../services/sheetsApi';
import type {
  Game, GameState, GameStoreRelation, StatisticsEntry, Store,
} from '../types/entities';
import type { BucketAMatch, BucketBMatch, SteamGame } from '../utils/fuzzyMatch';

export interface BatchImportParams {
  toAutoMerge: BucketAMatch[];
  toMergeManually: BucketBMatch[];
  toImportAsNew: SteamGame[];
}

export interface BatchImportResult {
  newGamesAdded: number;
  autoMerged: number;
}

interface SheetDataState {
  games: Game[];
  stores: Store[];
  relations: GameStoreRelation[];
  statisticsHistory: StatisticsEntry[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  isOperating: boolean;
  error: string | null;
}

export interface UseSheetDataReturn extends SheetDataState {
  /** All owned (non-wishlist) games. */
  ownedGames: Game[];
  /** All wishlisted games. */
  wishlistGames: Game[];
  /** Reload games/stores/relations from the spreadsheet. */
  refresh: () => Promise<void>;
  /** Reload statistics history from the spreadsheet. */
  refreshHistory: () => Promise<void>;
  /** Derived: store IDs associated with a game. */
  getStoreIdsForGame: (gameId: string) => string[];
  /** Derived: games that exist only on the given store (would become orphaned on deletion). */
  getGamesOnlyOnStore: (storeId: string) => Game[];
  createGame: (title: string, state: GameState, storeIds: string[]) => Promise<void>;
  createWishlistGame: (title: string, storeIds: string[]) => Promise<void>;
  updateGame: (game: Game, newStoreIds: string[]) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  markAsBought: (gameId: string, purchasedStoreIds: string[]) => Promise<void>;
  createStore: (name: string) => Promise<void>;
  updateStore: (store: Store) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  batchImport: (
    params: BatchImportParams,
    onProgress?: (pct: number) => void,
  ) => Promise<BatchImportResult>;
  clearError: () => void;
}

const initialState: SheetDataState = {
  games: [],
  stores: [],
  relations: [],
  statisticsHistory: [],
  isLoading: true,
  isHistoryLoading: true,
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
      setData((prev) => ({
        ...prev, games, stores, relations, isLoading: false, isOperating: false, error: null,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load data.',
      }));
    }
  }, [spreadsheetId, getToken]);

  const refreshHistory = useCallback(async (): Promise<void> => {
    if (!spreadsheetId) return;
    setData((prev) => ({ ...prev, isHistoryLoading: true }));
    try {
      const token = await getToken();
      const statisticsHistory = await getStatisticsHistory(spreadsheetId, token);
      setData((prev) => ({ ...prev, statisticsHistory, isHistoryLoading: false }));
    } catch {
      setData((prev) => ({ ...prev, isHistoryLoading: false }));
    }
  }, [spreadsheetId, getToken]);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      if (!spreadsheetId) return;
      try {
        const token = await getToken();
        const [games, stores, relations, statisticsHistory] = await Promise.all([
          getGames(spreadsheetId, token),
          getStores(spreadsheetId, token),
          getRelations(spreadsheetId, token),
          getStatisticsHistory(spreadsheetId, token),
        ]);
        if (active) {
          setData({
            games,
            stores,
            relations,
            statisticsHistory,
            isLoading: false,
            isHistoryLoading: false,
            isOperating: false,
            error: null,
          });
        }
      } catch (err) {
        if (active) {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            isHistoryLoading: false,
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
          isWishlist: false,
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

  const createWishlistGame = useCallback(
    async (title: string, storeIds: string[]): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        const newGame: Game = {
          id: crypto.randomUUID(),
          title,
          state: 'Not Yet Played',
          isWishlist: true,
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

  const markAsBought = useCallback(
    async (gameId: string, purchasedStoreIds: string[]): Promise<void> => {
      await operate(async () => {
        const token = await getToken();
        const game = data.games.find((g) => g.id === gameId);
        if (!game) throw new Error(`Game with id "${gameId}" not found.`);
        const updatedGame: Game = { ...game, isWishlist: false, state: 'Not Yet Played' };
        await apiUpdateGame(spreadsheetId, updatedGame, token);
        await deleteRelationsForGame(spreadsheetId, gameId, token);
        await Promise.all(
          purchasedStoreIds.map((storeId) =>
            createRelation(spreadsheetId, { gameId, storeId }, token)),
        );
      });
    },
    [spreadsheetId, getToken, operate, data.games],
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

  const ownedGames = useMemo(
    () => data.games.filter((g) => !g.isWishlist),
    [data.games],
  );

  const wishlistGames = useMemo(
    () => data.games.filter((g) => g.isWishlist),
    [data.games],
  );

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

  // ---------------------------------------------------------------------------
  // Steam batch import
  // ---------------------------------------------------------------------------

  const batchImport = useCallback(
    async (
      params: BatchImportParams,
      onProgress?: (pct: number) => void,
    ): Promise<BatchImportResult> => {
      const token = await getToken();

      // Find or create the "Steam" store
      let steamStore = data.stores.find((s) => s.name.toLowerCase() === 'steam') ?? null;
      if (!steamStore) {
        const newStore: Store = { id: crypto.randomUUID(), name: 'Steam' };
        await apiCreateStore(spreadsheetId, newStore, token);
        steamStore = newStore;
      }
      const steamStoreId = steamStore.id;

      onProgress?.(10);

      // Build all new Game entities up front
      const newGames: Game[] = params.toImportAsNew.map((steamGame) => ({
        id: crypto.randomUUID(),
        title: steamGame.name,
        state: 'Not Yet Played' as const,
        isWishlist: steamGame.isWishlist,
      }));

      // Write all new games in one API call
      await apiCreateGames(spreadsheetId, newGames, token);

      onProgress?.(50);

      // Build all relations to write: merge relations + new-game relations
      const existingRelationKeys = new Set(
        data.relations.map((r) => `${r.gameId}:${r.storeId}`),
      );

      const mergeRelations: GameStoreRelation[] = [
        ...params.toAutoMerge,
        ...params.toMergeManually,
      ]
        .filter((match) => !existingRelationKeys.has(`${match.dbGame.id}:${steamStoreId}`))
        .map((match) => ({ gameId: match.dbGame.id, storeId: steamStoreId }));

      const newGameRelations: GameStoreRelation[] = newGames.map((g) => ({
        gameId: g.id,
        storeId: steamStoreId,
      }));

      // Write all relations in one API call
      await apiCreateRelations(spreadsheetId, [...mergeRelations, ...newGameRelations], token);

      onProgress?.(90);

      await refresh();

      onProgress?.(100);

      return {
        newGamesAdded: newGames.length,
        autoMerged: params.toAutoMerge.length,
      };
    },
    [spreadsheetId, getToken, data.stores, data.relations, refresh],
  );

  return {
    ...data,
    ownedGames,
    wishlistGames,
    refresh,
    refreshHistory,
    getStoreIdsForGame,
    getGamesOnlyOnStore,
    createGame,
    createWishlistGame,
    updateGame,
    deleteGame,
    markAsBought,
    createStore,
    updateStore,
    deleteStore,
    batchImport,
    clearError,
  };
}

export default useSheetData;
