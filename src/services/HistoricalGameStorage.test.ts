import { describe, expect, it } from 'vitest';
import { NFLGame } from '../models/NFLGame';
import { mergeHistoricalGames, readHistoricalGames } from './HistoricalGameStorage';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    length: 0,
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function createGame(week: string, date: string, totalLine: number | null): NFLGame {
  return new NFLGame({
    week,
    date,
    team1: 'Atlanta Falcons',
    team2: 'Green Bay Packers',
    team1Score: 35,
    team2Score: 14,
    totalLine,
  });
}

describe('HistoricalGameStorage', () => {
  it('merges new weeks and updates an existing game without duplicates', () => {
    const storage = createStorage();
    const week3 = createGame('Week 3', 'Sep 24', null);
    const completedWeek3 = createGame('Week 3', 'Sep 24', 42.5);
    const week4 = createGame('Week 4', 'Oct 01', 44.5);

    mergeHistoricalGames([week3], [completedWeek3, week4], storage);

    const savedGames = readHistoricalGames(storage);
    expect(savedGames).toHaveLength(2);
    expect(savedGames[0].totalLine).toBe(42.5);
    expect(savedGames[1].week).toBe('Week 4');
  });
});