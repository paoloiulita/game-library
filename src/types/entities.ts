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
  date: string;
  finished: number;
  diffFinished: number | null;
  putAside: number;
  diffPutAside: number | null;
  notYetPlayed: number;
  diffNotYetPlayed: number | null;
  total: number;
  percentNotYetPlayed: number;
  diffPercentNotYetPlayed: number | null;
}

export interface AppConfig {
  clientId: string;
  spreadsheetId: string;
}
