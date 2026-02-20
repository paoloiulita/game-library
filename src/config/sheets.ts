export const SHEET_NAMES = {
  GAMES: 'Games',
  STORES: 'Stores',
  GAME_STORE_RELATIONS: 'Game_Store_Relations',
  STATISTICS_HISTORY: 'Statistics_History',
} as const;

export const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const GAMES_HEADERS = ['ID', 'Title', 'State'];
export const STORES_HEADERS = ['ID', 'Name'];
export const RELATIONS_HEADERS = ['GameID', 'StoreID'];
export const STATS_HEADERS = [
  'Date',
  'Finished',
  'Diff Finished',
  'Put Aside',
  'Diff Put Aside',
  'Not Yet Played',
  'Diff Not Yet Played',
  'Total',
  '% Not Yet Played',
  'Diff % Not Yet Played',
];

export const STORAGE_KEYS = {
  CLIENT_ID: 'vgl_client_id',
  SPREADSHEET_ID: 'vgl_spreadsheet_id',
} as const;
