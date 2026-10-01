import { NFLGame } from '../models/NFLGame';

export const HISTORICAL_GAMES_KEY = 'totaledge.historical-games';

interface StoredGame {
  week: string;
  date: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  totalLine: number | null;
}

export function readHistoricalGames(storage: Storage = localStorage): NFLGame[] {
  try {
    const raw = storage.getItem(HISTORICAL_GAMES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is StoredGame => isStoredGame(value))
      .map((game) => new NFLGame(game));
  } catch {
    return [];
  }
}

export function mergeHistoricalGames(
  existingGames: NFLGame[],
  incomingGames: NFLGame[],
  storage: Storage = localStorage,
): NFLGame[] {
  const gamesByKey = new Map<string, NFLGame>();

  for (const game of [...existingGames, ...incomingGames]) {
    gamesByKey.set(getGameKey(game), game);
  }

  const mergedGames = Array.from(gamesByKey.values()).sort((left, right) => {
    return left.week.localeCompare(right.week, undefined, { numeric: true }) || left.date.localeCompare(right.date);
  });

  storage.setItem(HISTORICAL_GAMES_KEY, JSON.stringify(mergedGames));
  return mergedGames;
}

export async function readRemoteHistoricalGames(): Promise<NFLGame[]> {
  try {
    const response = await fetch(getRemoteApiUrl());
    if (!response.ok) {
      throw new Error(`Historical API returned ${response.status}.`);
    }

    const payload = await response.json() as { historical_games?: unknown };
    if (!Array.isArray(payload.historical_games)) {
      return [];
    }

    return payload.historical_games
      .filter((value): value is StoredGame => isStoredGame(value))
      .map((game) => new NFLGame(game));
  } catch {
    return [];
  }
}

export async function writeRemoteHistoricalGames(games: NFLGame[]): Promise<void> {
  const currentResponse = await fetch(getRemoteApiUrl());
  if (!currentResponse.ok) {
    throw new Error(`Historical API returned ${currentResponse.status}.`);
  }

  const currentPayload = await currentResponse.json() as Record<string, unknown>;
  const nextPayload = {
    ...currentPayload,
    historical_games: games,
  };
  const authToken = import.meta.env.VITE_NPOINT_API_AUTH_TOKEN as string | undefined;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(getRemoteApiUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(nextPayload),
  });

  if (!response.ok) {
    throw new Error(`Historical API returned ${response.status}.`);
  }
}

function getRemoteApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_NPOINT_API_URL as string | undefined;
  if (!configuredUrl) {
    throw new Error('VITE_NPOINT_API_URL is not configured.');
  }

  const binId = new URL(configuredUrl).pathname.split('/').filter(Boolean).pop();
  if (!binId) {
    throw new Error('VITE_NPOINT_API_URL does not contain a bin id.');
  }

  return `/api/npoint/${binId}`;
}

function getGameKey(game: NFLGame): string {
  return [game.week, game.date, game.team1, game.team2].map((value) => value.trim().toLowerCase()).join('|');
}

function isStoredGame(value: unknown): value is StoredGame {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const game = value as Partial<StoredGame>;
  return typeof game.week === 'string'
    && typeof game.date === 'string'
    && typeof game.team1 === 'string'
    && typeof game.team2 === 'string'
    && typeof game.team1Score === 'number'
    && typeof game.team2Score === 'number'
    && (game.totalLine === null || typeof game.totalLine === 'number');
}