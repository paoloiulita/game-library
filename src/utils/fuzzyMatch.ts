import type { Game } from '../types/entities';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SteamGame {
  appid: number;
  name: string;
  isWishlist: boolean;
}

export interface BucketAMatch {
  steamGame: SteamGame;
  dbGame: Game;
  score: number;
}

export interface BucketBMatch {
  steamGame: SteamGame;
  dbGame: Game;
  score: number;
  decision: 'merge' | 'import-new';
}

export interface CategorizationResult {
  bucketA: BucketAMatch[];
  bucketB: BucketBMatch[];
  bucketC: SteamGame[];
}

// ---------------------------------------------------------------------------
// String normalization
// ---------------------------------------------------------------------------

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '') // strip leading articles
    .replace(/[^a-z0-9\s]/g, '')   // remove punctuation and symbols
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Sørensen–Dice coefficient
// ---------------------------------------------------------------------------

function getBigrams(str: string): Map<string, number> {
  const bigrams = new Map<string, number>();
  for (let i = 0; i < str.length - 1; i++) {
    const bigram = str.slice(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }
  return bigrams;
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  let intersectionCount = 0;
  for (const [bigram, count] of aBigrams) {
    intersectionCount += Math.min(count, bBigrams.get(bigram) ?? 0);
  }

  return (2 * intersectionCount) / (a.length - 1 + b.length - 1);
}

// ---------------------------------------------------------------------------
// Categorization
// ---------------------------------------------------------------------------

const THRESHOLD_A = 0.95; // > this → auto-merge
const THRESHOLD_B = 0.60; // >= this → show user
const SUBSTRING_FLOOR = 0.65; // floor score when one title contains the other

export function categorizeSteamGames(
  steamGames: SteamGame[],
  dbGames: Game[],
): CategorizationResult {
  const bucketA: BucketAMatch[] = [];
  const bucketB: BucketBMatch[] = [];
  const bucketC: SteamGame[] = [];

  // Pre-normalize DB titles once for efficiency
  const normalizedDb = dbGames.map((game) => ({
    game,
    normalized: normalizeTitle(game.title),
  }));

  for (const steamGame of steamGames) {
    const normalizedSteam = normalizeTitle(steamGame.name);

    if (normalizedSteam.length === 0) {
      bucketC.push(steamGame);
      continue;
    }

    let bestScore = 0;
    let bestDbGame: Game | null = null;

    for (const { game, normalized } of normalizedDb) {
      if (normalized.length === 0) continue;

      let score = diceCoefficient(normalizedSteam, normalized);

      // Substring boost: if one title contains the other, guarantee Bucket B
      const isSubstring =
        normalized.includes(normalizedSteam) || normalizedSteam.includes(normalized);
      if (isSubstring && score < SUBSTRING_FLOOR) {
        score = SUBSTRING_FLOOR;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDbGame = game;
      }
    }

    if (bestScore > THRESHOLD_A && bestDbGame !== null) {
      bucketA.push({ steamGame, dbGame: bestDbGame, score: bestScore });
    } else if (bestScore >= THRESHOLD_B && bestDbGame !== null) {
      bucketB.push({ steamGame, dbGame: bestDbGame, score: bestScore, decision: 'merge' });
    } else {
      bucketC.push(steamGame);
    }
  }

  return { bucketA, bucketB, bucketC };
}
