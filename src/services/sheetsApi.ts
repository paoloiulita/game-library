import {
  SHEET_NAMES,
  SHEETS_API_BASE,
} from '../config/sheets';
import type {
  Game, GameStoreRelation, StatisticsEntry, Store,
} from '../types/entities';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface SheetProperties {
  sheetId: number;
  title: string;
}

interface SpreadsheetMetadata {
  sheets: Array<{ properties: SheetProperties }>;
}

interface ValueRange {
  values?: string[][];
}

interface ApiErrorBody {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authHeaders = (accessToken: string): HeadersInit => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

/** Throws a formatted error from a failed Sheets API response. */
const throwApiError = (body: ApiErrorBody): never => {
  throw new Error(`Sheets API error: ${body.error.message}`);
};

const assertOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorBody;
    throwApiError(body);
  }
};

/** Extracts the spreadsheet ID from a full Google Sheets URL or returns the
 *  value unchanged if it is already just an ID. */
export const extractSpreadsheetId = (urlOrId: string): string => {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
};

// ---------------------------------------------------------------------------
// Low-level API wrappers
// ---------------------------------------------------------------------------

export const getSpreadsheetMetadata = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<SpreadsheetMetadata> => {
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}`, {
    headers: authHeaders(accessToken),
  });
  await assertOk(response);
  return response.json() as Promise<SpreadsheetMetadata>;
};

export const getSheetValues = async (
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
): Promise<string[][]> => {
  const range = encodeURIComponent(`${sheetName}!A:ZZ`);
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`,
    { headers: authHeaders(accessToken) },
  );
  await assertOk(response);
  const data = (await response.json()) as ValueRange;
  return data.values ?? [];
};

export const appendSheetRow = async (
  spreadsheetId: string,
  sheetName: string,
  values: string[],
  accessToken: string,
): Promise<void> => {
  const range = encodeURIComponent(`${sheetName}!A:A`);
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: [values] }),
    },
  );
  await assertOk(response);
};

/** Appends multiple rows to a sheet in a single API call. No-op if rows is empty. */
export const appendSheetRows = async (
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
  accessToken: string,
): Promise<void> => {
  if (rows.length === 0) return;
  const range = encodeURIComponent(`${sheetName}!A:A`);
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: rows }),
    },
  );
  await assertOk(response);
};

/** Updates the data row at `rowIndex` (0-based, excluding the header row). */
export const updateSheetRow = async (
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  values: string[],
  accessToken: string,
): Promise<void> => {
  const sheetRow = rowIndex + 2; // +1 header, +1 for 1-based index
  const range = encodeURIComponent(`${sheetName}!A${sheetRow}`);
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: [values] }),
    },
  );
  await assertOk(response);
};

/** Deletes the data row at `rowIndex` (0-based, excluding the header row). */
export const deleteSheetRow = async (
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number,
  accessToken: string,
): Promise<void> => {
  const startIndex = rowIndex + 1; // +1 to skip the header row
  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    }),
  });
  await assertOk(response);
};

// ---------------------------------------------------------------------------
// Entity-level helpers (used by CRUD services)
// ---------------------------------------------------------------------------

/** Returns the numeric sheetId for a named sheet tab. */
export const getSheetId = async (
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
): Promise<number> => {
  const metadata = await getSpreadsheetMetadata(spreadsheetId, accessToken);
  const sheet = metadata.sheets.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in spreadsheet.`);
  return sheet.properties.sheetId;
};

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const rowToGame = (row: string[]): Game => ({
  id: row[0] ?? '',
  title: row[1] ?? '',
  state: (row[2] as Game['state']) ?? 'Not Yet Played',
  // Column D is absent on rows written before the Wishlist feature → default false
  isWishlist: row[3]?.toUpperCase() === 'TRUE',
});

const gameToRow = (game: Game): string[] => [
  game.id, game.title, game.state, game.isWishlist ? 'TRUE' : 'FALSE',
];

export const getGames = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<Game[]> => {
  const rows = await getSheetValues(spreadsheetId, SHEET_NAMES.GAMES, accessToken);
  return rows.slice(1).map(rowToGame); // skip header row
};

export const createGame = async (
  spreadsheetId: string,
  game: Game,
  accessToken: string,
): Promise<void> => {
  await appendSheetRow(spreadsheetId, SHEET_NAMES.GAMES, gameToRow(game), accessToken);
};

/** Appends multiple games in a single API call. */
export const createGames = async (
  spreadsheetId: string,
  games: Game[],
  accessToken: string,
): Promise<void> => {
  await appendSheetRows(spreadsheetId, SHEET_NAMES.GAMES, games.map(gameToRow), accessToken);
};

export const updateGame = async (
  spreadsheetId: string,
  game: Game,
  accessToken: string,
): Promise<void> => {
  const rows = await getSheetValues(spreadsheetId, SHEET_NAMES.GAMES, accessToken);
  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((r) => r[0] === game.id);
  if (rowIndex === -1) throw new Error(`Game with id "${game.id}" not found.`);
  await updateSheetRow(
    spreadsheetId,
    SHEET_NAMES.GAMES,
    rowIndex,
    gameToRow(game),
    accessToken,
  );
};

export const deleteGame = async (
  spreadsheetId: string,
  gameId: string,
  accessToken: string,
): Promise<void> => {
  const [rows, sheetId] = await Promise.all([
    getSheetValues(spreadsheetId, SHEET_NAMES.GAMES, accessToken),
    getSheetId(spreadsheetId, SHEET_NAMES.GAMES, accessToken),
  ]);
  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((r) => r[0] === gameId);
  if (rowIndex === -1) throw new Error(`Game with id "${gameId}" not found.`);
  await deleteSheetRow(spreadsheetId, sheetId, rowIndex, accessToken);
};

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const rowToStore = (row: string[]): Store => ({
  id: row[0] ?? '',
  name: row[1] ?? '',
});

const storeToRow = (store: Store): string[] => [store.id, store.name];

export const getStores = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<Store[]> => {
  const rows = await getSheetValues(spreadsheetId, SHEET_NAMES.STORES, accessToken);
  return rows.slice(1).map(rowToStore);
};

export const createStore = async (
  spreadsheetId: string,
  store: Store,
  accessToken: string,
): Promise<void> => {
  await appendSheetRow(spreadsheetId, SHEET_NAMES.STORES, storeToRow(store), accessToken);
};

export const updateStore = async (
  spreadsheetId: string,
  store: Store,
  accessToken: string,
): Promise<void> => {
  const rows = await getSheetValues(spreadsheetId, SHEET_NAMES.STORES, accessToken);
  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((r) => r[0] === store.id);
  if (rowIndex === -1) throw new Error(`Store with id "${store.id}" not found.`);
  await updateSheetRow(
    spreadsheetId,
    SHEET_NAMES.STORES,
    rowIndex,
    storeToRow(store),
    accessToken,
  );
};

export const deleteStore = async (
  spreadsheetId: string,
  storeId: string,
  accessToken: string,
): Promise<void> => {
  const [rows, sheetId] = await Promise.all([
    getSheetValues(spreadsheetId, SHEET_NAMES.STORES, accessToken),
    getSheetId(spreadsheetId, SHEET_NAMES.STORES, accessToken),
  ]);
  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex((r) => r[0] === storeId);
  if (rowIndex === -1) throw new Error(`Store with id "${storeId}" not found.`);
  await deleteSheetRow(spreadsheetId, sheetId, rowIndex, accessToken);
};

// ---------------------------------------------------------------------------
// Game-Store Relations
// ---------------------------------------------------------------------------

const rowToRelation = (row: string[]): GameStoreRelation => ({
  gameId: row[0] ?? '',
  storeId: row[1] ?? '',
});

export const getRelations = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<GameStoreRelation[]> => {
  const rows = await getSheetValues(
    spreadsheetId,
    SHEET_NAMES.GAME_STORE_RELATIONS,
    accessToken,
  );
  return rows.slice(1).map(rowToRelation);
};

export const createRelation = async (
  spreadsheetId: string,
  relation: GameStoreRelation,
  accessToken: string,
): Promise<void> => {
  await appendSheetRow(
    spreadsheetId,
    SHEET_NAMES.GAME_STORE_RELATIONS,
    [relation.gameId, relation.storeId],
    accessToken,
  );
};

/** Appends multiple game-store relations in a single API call. */
export const createRelations = async (
  spreadsheetId: string,
  relations: GameStoreRelation[],
  accessToken: string,
): Promise<void> => {
  await appendSheetRows(
    spreadsheetId,
    SHEET_NAMES.GAME_STORE_RELATIONS,
    relations.map((r) => [r.gameId, r.storeId]),
    accessToken,
  );
};

export const deleteRelation = async (
  spreadsheetId: string,
  gameId: string,
  storeId: string,
  accessToken: string,
): Promise<void> => {
  const [rows, sheetId] = await Promise.all([
    getSheetValues(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
    getSheetId(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
  ]);
  const dataRows = rows.slice(1);
  const rowIndex = dataRows.findIndex(
    (r) => r[0] === gameId && r[1] === storeId,
  );
  if (rowIndex === -1) throw new Error('Game-store relation not found.');
  await deleteSheetRow(spreadsheetId, sheetId, rowIndex, accessToken);
};

/** Deletes ALL relations for a given store in a single batchUpdate.
 *  Requests are sorted descending so that row indices remain valid as each
 *  deletion is applied sequentially within the batch. */
export const deleteRelationsForStore = async (
  spreadsheetId: string,
  storeId: string,
  accessToken: string,
): Promise<void> => {
  const [rows, sheetId] = await Promise.all([
    getSheetValues(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
    getSheetId(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
  ]);

  // rows[0] is the header; data rows start at sheet index 1
  const indices = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => i > 0 && row[1] === storeId)
    .map(({ i }) => i)
    .sort((a, b) => b - a); // descending

  if (indices.length === 0) return;

  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: indices.map((rowIndex) => ({
        deleteDimension: {
          range: {
            sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1,
          },
        },
      })),
    }),
  });
  await assertOk(response);
};

/** Deletes ALL relations for a given game in a single batchUpdate. */
export const deleteRelationsForGame = async (
  spreadsheetId: string,
  gameId: string,
  accessToken: string,
): Promise<void> => {
  const [rows, sheetId] = await Promise.all([
    getSheetValues(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
    getSheetId(spreadsheetId, SHEET_NAMES.GAME_STORE_RELATIONS, accessToken),
  ]);

  const indices = rows
    .map((row, i) => ({ row, i }))
    .filter(({ row, i }) => i > 0 && row[0] === gameId)
    .map(({ i }) => i)
    .sort((a, b) => b - a);

  if (indices.length === 0) return;

  const response = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: indices.map((rowIndex) => ({
        deleteDimension: {
          range: {
            sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1,
          },
        },
      })),
    }),
  });
  await assertOk(response);
};

// ---------------------------------------------------------------------------
// Statistics History
// ---------------------------------------------------------------------------

const rowToEntry = (row: string[]): StatisticsEntry => ({
  date: row[0] ?? '',
  finished: Number(row[1] ?? 0),
  diffFinished: row[2] !== undefined && row[2] !== '' ? Number(row[2]) : null,
  putAside: Number(row[3] ?? 0),
  diffPutAside: row[4] !== undefined && row[4] !== '' ? Number(row[4]) : null,
  notYetPlayed: Number(row[5] ?? 0),
  diffNotYetPlayed: row[6] !== undefined && row[6] !== '' ? Number(row[6]) : null,
  total: Number(row[7] ?? 0),
  percentNotYetPlayed: Number(row[8] ?? 0),
  diffPercentNotYetPlayed:
    row[9] !== undefined && row[9] !== '' ? Number(row[9]) : null,
});

const entryToRow = (entry: StatisticsEntry): string[] => [
  entry.date,
  String(entry.finished),
  entry.diffFinished !== null ? String(entry.diffFinished) : '',
  String(entry.putAside),
  entry.diffPutAside !== null ? String(entry.diffPutAside) : '',
  String(entry.notYetPlayed),
  entry.diffNotYetPlayed !== null ? String(entry.diffNotYetPlayed) : '',
  String(entry.total),
  String(entry.percentNotYetPlayed),
  entry.diffPercentNotYetPlayed !== null ? String(entry.diffPercentNotYetPlayed) : '',
];

export const getStatisticsHistory = async (
  spreadsheetId: string,
  accessToken: string,
): Promise<StatisticsEntry[]> => {
  const rows = await getSheetValues(
    spreadsheetId,
    SHEET_NAMES.STATISTICS_HISTORY,
    accessToken,
  );
  return rows.slice(1).map(rowToEntry);
};

export const appendStatisticsEntry = async (
  spreadsheetId: string,
  entry: StatisticsEntry,
  accessToken: string,
): Promise<void> => {
  await appendSheetRow(
    spreadsheetId,
    SHEET_NAMES.STATISTICS_HISTORY,
    entryToRow(entry),
    accessToken,
  );
};
