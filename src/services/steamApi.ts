import type { SteamGame } from '../utils/fuzzyMatch';

const CORS_PROXY = 'https://corsproxy.io/?';

function proxied(url: string): string {
  return `${CORS_PROXY}${encodeURIComponent(url)}`;
}

export interface SteamFetchResult {
  ownedGames: SteamGame[];
  wishlistGames: SteamGame[];
}

// ---------------------------------------------------------------------------
// Steam ID resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a Steam profile URL (numeric or vanity) to a Steam64 ID string.
 * Accepts:
 *   - https://steamcommunity.com/profiles/76561198XXXXXXXXX[/]
 *   - https://steamcommunity.com/id/vanityname[/]
 *   - A bare 17-digit Steam64 ID
 */
export async function resolveSteamId(profileUrl: string): Promise<string> {
  const trimmed = profileUrl.trim();

  // Case 1: numeric Steam64 ID in URL path
  const numericMatch = trimmed.match(/\/profiles\/(\d{17})/);
  if (numericMatch) return numericMatch[1];

  // Case 2: bare 17-digit Steam64 ID
  const bareId = trimmed.match(/^(7656119\d{10})$/);
  if (bareId) return bareId[1];

  // Case 3: vanity URL — resolve via Steam's XML endpoint (no API key needed)
  const vanityMatch = trimmed.match(/\/id\/([^/?#\s]+)/);
  if (vanityMatch) {
    const vanity = vanityMatch[1];
    const xmlUrl = `https://steamcommunity.com/id/${vanity}?xml=1`;
    let response: Response;
    try {
      response = await fetch(proxied(xmlUrl));
    } catch {
      throw new Error('Network error while resolving Steam vanity URL. Check your internet connection.');
    }
    if (!response.ok) {
      throw new Error(`Failed to resolve Steam vanity URL (HTTP ${response.status}).`);
    }
    const text = await response.text();
    const idMatch = text.match(/<steamID64>(\d{17})<\/steamID64>/);
    if (!idMatch) {
      throw new Error(
        'Could not find Steam ID in profile. Make sure the profile is public and the URL is correct.',
      );
    }
    return idMatch[1];
  }

  throw new Error(
    'Invalid Steam profile URL. Expected:\n'
    + '  https://steamcommunity.com/profiles/[STEAM_ID]\n'
    + '  https://steamcommunity.com/id/[vanity_name]',
  );
}

// ---------------------------------------------------------------------------
// Owned games (Steam Web API — IPlayerService/GetOwnedGames/v1)
// ---------------------------------------------------------------------------

interface RawGetOwnedGamesResponse {
  response: {
    game_count?: number;
    games?: Array<{ appid: number; name: string }>;
  };
}

export async function fetchOwnedGames(
  steamId: string,
  apiKey: string,
): Promise<SteamGame[]> {
  const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('include_appinfo', 'true');
  url.searchParams.set('format', 'json');

  let response: Response;
  try {
    response = await fetch(proxied(url.toString()));
  } catch {
    throw new Error('Network error while fetching Steam game library.');
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Steam game library (HTTP ${response.status}).`);
  }

  let data: RawGetOwnedGamesResponse;
  try {
    data = (await response.json()) as RawGetOwnedGamesResponse;
  } catch {
    throw new Error('Failed to parse Steam API response.');
  }

  const games = data.response?.games ?? [];
  return games
    .filter((g) => g.name?.trim().length > 0)
    .map((g) => ({ appid: g.appid, name: g.name, isWishlist: false }));
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

interface RawWishlistEntry {
  name: string;
}

export async function fetchWishlist(steamId: string): Promise<SteamGame[]> {
  const url = `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/`;
  let response: Response;
  try {
    response = await fetch(proxied(url));
  } catch {
    throw new Error('Network error while fetching Steam wishlist.');
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Steam wishlist (HTTP ${response.status}).`);
  }

  let data: Record<string, RawWishlistEntry> | unknown[];
  try {
    data = (await response.json()) as Record<string, RawWishlistEntry> | unknown[];
  } catch {
    throw new Error('Failed to parse Steam wishlist. The wishlist may be private.');
  }

  // Steam returns [] for private or empty wishlists
  if (Array.isArray(data)) return [];

  return Object.entries(data as Record<string, RawWishlistEntry>)
    .filter(([, entry]) => entry.name?.trim().length > 0)
    .map(([appid, entry]) => ({
      appid: Number(appid),
      name: entry.name,
      isWishlist: true,
    }));
}

// ---------------------------------------------------------------------------
// Combined fetch with deduplication
// ---------------------------------------------------------------------------

export async function fetchAllSteamGames(
  steamId: string,
  apiKey: string,
): Promise<SteamFetchResult> {
  const [ownedGames] = await Promise.all([
    fetchOwnedGames(steamId, apiKey),
    // fetchWishlist(steamId),
  ]);

  // If a game appears in both (owned + wishlisted), owned takes precedence
  // const ownedAppIds = new Set(ownedGames.map((g) => g.appid));
  // const deduplicatedWishlist = wishlistGames.filter((g) => !ownedAppIds.has(g.appid));

  return { ownedGames, wishlistGames: [] };
}
