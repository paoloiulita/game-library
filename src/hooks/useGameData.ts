import {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import {
  createGame as createSupabaseGame,
  createGames as createSupabaseGames,
  createRelation as createSupabaseRelation,
  createRelations as createSupabaseRelations,
  createStore as createSupabaseStore,
  deleteGame as deleteSupabaseGame,
  deleteRelationsForGame as deleteSupabaseRelationsForGame,
  deleteRelationsForStore as deleteSupabaseRelationsForStore,
  deleteStore as deleteSupabaseStore,
  getGames as getSupabaseGames,
  getRelations as getSupabaseRelations,
  getStatistics as getSupabaseStatistics,
  getStores as getSupabaseStores,
  updateGame as updateSupabaseGame,
  updateStore as updateSupabaseStore,
} from '../services/supabaseRepository';
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

interface GameDataState {
  games: Game[];
  stores: Store[];
  relations: GameStoreRelation[];
  statisticsHistory: StatisticsEntry[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  isOperating: boolean;
  error: string | null;
}

export interface UseGameDataReturn extends GameDataState {
  /** All owned (non-wishlist) games. */
  ownedGames: Game[];
  /** All wishlisted games. */
  wishlistGames: Game[];
  /** Reload games/stores/relations from Supabase. */
  refresh: () => Promise<void>;
  /** Reload statistics history when that feature is enabled. */
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

const initialState: GameDataState = {
  games: [],
  stores: [],
  relations: [],
  statisticsHistory: [],
  isLoading: true,
  isHistoryLoading: true,
  isOperating: false,
  error: null,
};

interface CoreDataLoadResult {
  games: Game[];
  stores: Store[];
  relations: GameStoreRelation[];
}

const loadCoreData = async (): Promise<CoreDataLoadResult> => {
  const [games, stores, relations] = await Promise.all([
    getSupabaseGames(),
    getSupabaseStores(),
    getSupabaseRelations(),
  ]);
  return { games, stores, relations };
};

function useGameData(): UseGameDataReturn {
  const [data, setData] = useState<GameDataState>(initialState);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async (): Promise<void> => {
    setData((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await loadCoreData();
      setData((prev) => ({
        ...prev, ...result, isLoading: false, isOperating: false, error: null,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load data.',
      }));
    }
  }, []);

  const refreshHistory = useCallback(async (): Promise<void> => {
    setData((prev) => ({ ...prev, isHistoryLoading: true }));
    try {
      const statisticsHistory = await getSupabaseStatistics();
      setData((prev) => ({ ...prev, statisticsHistory, isHistoryLoading: false }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isHistoryLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load statistics.',
      }));
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      try {
        const result = await loadCoreData();
        const statisticsHistory = await getSupabaseStatistics();
        if (active) {
          setData({
            ...result,
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
  }, []);

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
        const newGame: Game = {
          id: crypto.randomUUID(),
          title,
          state: gameState,
          isWishlist: false,
        };
        await createSupabaseGame(newGame);
        await Promise.all(
          storeIds.map((storeId) =>
            createSupabaseRelation({ gameId: newGame.id, storeId })),
        );
      });
    },
    [operate],
  );

  const createWishlistGame = useCallback(
    async (title: string, storeIds: string[]): Promise<void> => {
      await operate(async () => {
        const newGame: Game = {
          id: crypto.randomUUID(),
          title,
          state: 'Not Yet Played',
          isWishlist: true,
        };
        await createSupabaseGame(newGame);
        await Promise.all(
          storeIds.map((storeId) =>
            createSupabaseRelation({ gameId: newGame.id, storeId })),
        );
      });
    },
    [operate],
  );

  const updateGame = useCallback(
    async (game: Game, newStoreIds: string[]): Promise<void> => {
      await operate(async () => {
        await updateSupabaseGame(game);
        // Replace all relations: delete then re-create
        await deleteSupabaseRelationsForGame(game.id);
        await Promise.all(
          newStoreIds.map((storeId) =>
            createSupabaseRelation({ gameId: game.id, storeId })),
        );
      });
    },
    [operate],
  );

  const deleteGame = useCallback(
    async (gameId: string): Promise<void> => {
      await operate(async () => {
        await deleteSupabaseRelationsForGame(gameId);
        await deleteSupabaseGame(gameId);
      });
    },
    [operate],
  );

  const markAsBought = useCallback(
    async (gameId: string, purchasedStoreIds: string[]): Promise<void> => {
      await operate(async () => {
        const game = data.games.find((g) => g.id === gameId);
        if (!game) throw new Error(`Game with id "${gameId}" not found.`);
        const updatedGame: Game = { ...game, isWishlist: false, state: 'Not Yet Played' };
        await updateSupabaseGame(updatedGame);
        await deleteSupabaseRelationsForGame(gameId);
        await Promise.all(
          purchasedStoreIds.map((storeId) =>
            createSupabaseRelation({ gameId, storeId })),
        );
      });
    },
    [operate, data.games],
  );

  // ---------------------------------------------------------------------------
  // Stores CRUD
  // ---------------------------------------------------------------------------

  const createStore = useCallback(
    async (name: string): Promise<void> => {
      await operate(async () => {
        const newStore: Store = { id: crypto.randomUUID(), name };
        await createSupabaseStore(newStore);
      });
    },
    [operate],
  );

  const updateStore = useCallback(
    async (store: Store): Promise<void> => {
      await operate(async () => {
        await updateSupabaseStore(store);
      });
    },
    [operate],
  );

  const deleteStore = useCallback(
    async (storeId: string): Promise<void> => {
      await operate(async () => {
        await deleteSupabaseRelationsForStore(storeId);
        await deleteSupabaseStore(storeId);
      });
    },
    [operate],
  );

  // ---------------------------------------------------------------------------
  // Derived helpers
  // ---------------------------------------------------------------------------

  const ownedGames = useMemo(
    () => data.games.filter((g) => !g.isWishlist).sort((a, b) => a.title.localeCompare(b.title)),
    [data.games],
  );

  const wishlistGames = useMemo(
    () => data.games.filter((g) => g.isWishlist).sort((a, b) => a.title.localeCompare(b.title)),
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
      // Find or create the "Steam" store
      let steamStore = data.stores.find((s) => s.name.toLowerCase() === 'steam') ?? null;
      if (!steamStore) {
        const newStore: Store = { id: crypto.randomUUID(), name: 'Steam' };
        await createSupabaseStore(newStore);
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
      await createSupabaseGames(newGames);

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
      await createSupabaseRelations([...mergeRelations, ...newGameRelations]);

      onProgress?.(90);

      await refresh();

      onProgress?.(100);

      return {
        newGamesAdded: newGames.length,
        autoMerged: params.toAutoMerge.length,
      };
    },
    [data.stores, data.relations, refresh],
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

export default useGameData;
