import {
  GAME_STATES,
  type Game,
  type GameState,
  type GameStoreRelation,
  type Store,
  type StatisticsEntry,
} from '../types/entities';

import supabase from './supabaseClient';

const PAGE_SIZE = 1000;

const fetchAllPages = async <T>(
  fetchPage: (start: number, end: number) => Promise<T[]>,
): Promise<T[]> => {
  const fetchRemainingPages = async (pageIndex: number, rows: T[]): Promise<T[]> => {
    const start = pageIndex * PAGE_SIZE;
    const page = await fetchPage(start, start + PAGE_SIZE - 1);
    const allRows = [...rows, ...page];
    return page.length < PAGE_SIZE
      ? allRows
      : fetchRemainingPages(pageIndex + 1, allRows);
  };

  return fetchRemainingPages(0, []);
};

const toGameState = (state: string | null): GameState => {
  if (state && GAME_STATES.includes(state as GameState)) {
    return state as GameState;
  }
  throw new Error(`Invalid game state returned by Supabase: ${state ?? 'null'}`);
};

export const getGames = async (): Promise<Game[]> => {
  const rows = await fetchAllPages(async (start, end) => {
    const { data, error } = await supabase
      .from('games')
      .select('ID, Title, State, IsWishlist')
      .order('ID', { ascending: true })
      .range(start, end);

    if (error) throw error;
    return data;
  });

  return rows.map((row) => ({
    id: row.ID,
    title: row.Title ?? '',
    state: toGameState(row.State),
    isWishlist: row.IsWishlist ?? false,
  }));
};

export const getStores = async (): Promise<Store[]> => {
  const rows = await fetchAllPages(async (start, end) => {
    const { data, error } = await supabase
      .from('stores')
      .select('ID, Name')
      .order('Name', { ascending: true })
      .order('ID', { ascending: true })
      .range(start, end);

    if (error) throw error;
    return data;
  });

  return rows.map((row) => ({
    id: row.ID,
    name: row.Name ?? '',
  }));
};

export const getRelations = async (): Promise<GameStoreRelation[]> => {
  const rows = await fetchAllPages(async (start, end) => {
    const { data, error } = await supabase
      .from('game_store')
      .select('GameID, StoreID')
      .not('GameID', 'is', null)
      .not('StoreID', 'is', null)
      .order('GameID', { ascending: true })
      .order('StoreID', { ascending: true })
      .range(start, end);

    if (error) throw error;
    return data;
  });

  return rows.map((row) => ({
    gameId: row.GameID as string,
    storeId: row.StoreID as string,
  }));
};

export const getStatistics = async (): Promise<StatisticsEntry[]> => {
  const rows = await fetchAllPages(async (start, end) => {
    const { data, error } = await supabase
      .from('statistics')
      .select('ID, CreatedAt, Finished, PutAside, NotYetPlayed')
      .order('CreatedAt', { ascending: false })
      .order('ID', { ascending: false })
      .range(start, end);

    if (error) throw error;
    return data;
  });

  return rows.map((row) => ({
    id: row.ID,
    date: row.CreatedAt,
    finished: row.Finished,
    putAside: row.PutAside,
    notYetPlayed: row.NotYetPlayed,
  }));
};

export const createGame = async (game: Game): Promise<void> => {
  const { error } = await supabase.from('games').insert({
    ID: game.id,
    Title: game.title,
    State: game.state,
    IsWishlist: game.isWishlist,
  });

  if (error) throw error;
};

export const createGames = async (games: Game[]): Promise<void> => {
  if (games.length === 0) return;

  const { error } = await supabase.from('games').insert(
    games.map((game) => ({
      ID: game.id,
      Title: game.title,
      State: game.state,
      IsWishlist: game.isWishlist,
    })),
  );

  if (error) throw error;
};

export const updateGame = async (game: Game): Promise<void> => {
  const { error } = await supabase
    .from('games')
    .update({
      Title: game.title,
      State: game.state,
      IsWishlist: game.isWishlist,
    })
    .eq('ID', game.id);

  if (error) throw error;
};

export const deleteGame = async (gameId: string): Promise<void> => {
  const { error } = await supabase.from('games').delete().eq('ID', gameId);

  if (error) throw error;
};

export const createStore = async (store: Store): Promise<void> => {
  const { error } = await supabase.from('stores').insert({
    ID: store.id,
    Name: store.name,
  });

  if (error) throw error;
};

export const updateStore = async (store: Store): Promise<void> => {
  const { error } = await supabase
    .from('stores')
    .update({ Name: store.name })
    .eq('ID', store.id);

  if (error) throw error;
};

export const deleteStore = async (storeId: string): Promise<void> => {
  const { error } = await supabase.from('stores').delete().eq('ID', storeId);

  if (error) throw error;
};

export const createRelation = async (relation: GameStoreRelation): Promise<void> => {
  const { error } = await supabase.from('game_store').insert({
    GameID: relation.gameId,
    StoreID: relation.storeId,
  });

  if (error) throw error;
};

export const createRelations = async (relations: GameStoreRelation[]): Promise<void> => {
  if (relations.length === 0) return;

  const { error } = await supabase.from('game_store').insert(
    relations.map((relation) => ({
      GameID: relation.gameId,
      StoreID: relation.storeId,
    })),
  );

  if (error) throw error;
};

export const deleteRelation = async (gameId: string, storeId: string): Promise<void> => {
  const { error } = await supabase
    .from('game_store')
    .delete()
    .eq('GameID', gameId)
    .eq('StoreID', storeId);

  if (error) throw error;
};

export const deleteRelationsForGame = async (gameId: string): Promise<void> => {
  const { error } = await supabase.from('game_store').delete().eq('GameID', gameId);

  if (error) throw error;
};

export const deleteRelationsForStore = async (storeId: string): Promise<void> => {
  const { error } = await supabase.from('game_store').delete().eq('StoreID', storeId);

  if (error) throw error;
};
