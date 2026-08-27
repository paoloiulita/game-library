export type GameState = 'Finished' | 'Put Aside' | 'Not Yet Played';

export const GAME_STATES: readonly GameState[] = [
  'Finished',
  'Put Aside',
  'Not Yet Played',
] as const;

export interface Game {
  id: string;
  title: string;
  state: GameState;
  isWishlist: boolean;
}

export interface Store {
  id: string;
  name: string;
}

export interface GameStoreRelation {
  gameId: string;
  storeId: string;
}

export interface StatisticsEntry {
  id: string;
  date: string;
  finished: number;
  putAside: number;
  notYetPlayed: number;
}

export interface AppConfig {
  steamApiKey?: string;
}
