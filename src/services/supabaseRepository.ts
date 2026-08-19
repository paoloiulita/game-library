import {
  GAME_STATES,
  type Game,
  type GameState,
  type GameStoreRelation,
  type Store,
} from '../types/entities';

import supabase from './supabaseClient';

const toGameState = (state: string | null): GameState => {
  if (state && GAME_STATES.includes(state as GameState)) {
    return state as GameState;
  }
  throw new Error(`Invalid game state returned by Supabase: ${state ?? 'null'}`);
};

export const getGames = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from('games')
    .select('ID, Title, State, IsWishlist');

  if (error) throw error;

  return data.map((row) => ({
    id: row.ID,
    title: row.Title ?? '',
    state: toGameState(row.State),
    isWishlist: row.IsWishlist ?? false,
  }));
};

export const getStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores')
    .select('ID, Name');

  if (error) throw error;

  return data.map((row) => ({
    id: row.ID,
    name: row.Name ?? '',
  }));
};

export const getRelations = async (): Promise<GameStoreRelation[]> => {
  const { data, error } = await supabase
    .from('game_store')
    .select('GameID, StoreID')
    .not('GameID', 'is', null)
    .not('StoreID', 'is', null);

  if (error) throw error;

  return data.map((row) => ({
    gameId: row.GameID as string,
    storeId: row.StoreID as string,
  }));
};
