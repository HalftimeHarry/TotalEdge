import { describe, expect, it } from 'vitest';
import { NFLGame } from '../models/NFLGame';
import { BacktestService } from './BacktestService';

describe('BacktestService', () => {
  it('ranks midpoint settings by historical accuracy and ignores games without lines', () => {
    const games = [
      new NFLGame({ week: '1', date: 'Sep 01', team1: 'A', team2: 'B', team1Score: 28, team2Score: 24, totalLine: 42 }),
      new NFLGame({ week: '1', date: 'Sep 02', team1: 'C', team2: 'D', team1Score: 17, team2Score: 14, totalLine: 48 }),
      new NFLGame({ week: '1', date: 'Sep 03', team1: 'E', team2: 'F', team1Score: 23, team2Score: 23, totalLine: 44 }),
      new NFLGame({ week: '1', date: 'Sep 04', team1: 'G', team2: 'H', team1Score: 22, team2Score: 23, totalLine: 45 }),
    ];

    const results = new BacktestService().evaluateMidpoints(games, [42, 45]);

    expect(results[0]).toMatchObject({ midpoint: 45, games: 4, wins: 3, losses: 0, pushes: 1, accuracy: 1 });
    expect(results[1]).toMatchObject({ midpoint: 42, games: 4, wins: 2, losses: 1, pushes: 1, accuracy: 2 / 3 });
  });

  it('reports zero accuracy when no games have a usable total line', () => {
    const games = [
      new NFLGame({ week: '1', date: 'Sep 01', team1: 'A', team2: 'B', team1Score: 28, team2Score: 24 }),
    ];

    expect(new BacktestService().evaluateMidpoints(games, [45])[0]).toMatchObject({ games: 0, accuracy: 0 });
  });
});