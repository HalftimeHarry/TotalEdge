import { describe, expect, it } from 'vitest';
import { NFLGame } from '../models/NFLGame';
import { PredictionEngine } from './PredictionEngine';
import { TeamStrengthService } from './TeamStrengthService';

describe('PredictionEngine', () => {
  it('recommends over when the historical total is above the listed total line', () => {
    const predictions = new PredictionEngine().generatePredictions([
      new NFLGame({
        week: '1',
        date: 'Sep 09',
        team1: 'New England Patriots',
        team2: 'Seattle Seahawks',
        team1Score: 27,
        team2Score: 21,
        totalLine: 44.5,
      }),
    ]);

    expect(predictions).toHaveLength(1);
    expect(predictions[0].recommendation).toBe('BET OVER');
    expect(predictions[0].rationale).toContain('48 > 44.5');
  });

  it('recommends under when the historical total is below the listed total line', () => {
    const predictions = new PredictionEngine().generatePredictions([
      new NFLGame({
        week: '1',
        date: 'Sep 09',
        team1: 'New England Patriots',
        team2: 'Seattle Seahawks',
        team1Score: 17,
        team2Score: 23,
        totalLine: 45.5,
      }),
    ]);

    expect(predictions).toHaveLength(1);
    expect(predictions[0].recommendation).toBe('BET UNDER');
    expect(predictions[0].rationale).toContain('40 < 45.5');
  });

  it('returns a simple reason and rating for totals picks based on the total line', () => {
    const over = PredictionEngine.getTotalPickDetails(44);
    const under = PredictionEngine.getTotalPickDetails(48.5);

    expect(over.pick).toBe('OVER');
    expect(over.reason).toContain('below the 45-point midpoint');
    expect(over.rating).toBeGreaterThanOrEqual(6);
    expect(over.rating).toBeLessThanOrEqual(10);
    expect(over.strength).toMatch(/Strong|Moderate|Weak/);

    expect(under.pick).toBe('UNDER');
    expect(under.reason).toContain('above the 45-point midpoint');
    expect(under.rating).toBeGreaterThanOrEqual(6);
    expect(under.strength).toMatch(/Strong|Moderate|Weak/);
  });

  it('explains the pick using the actual team name when available', () => {
    const pick = PredictionEngine.getTotalPickDetails(40.5, 'Jacksonville Jaguars');

    expect(pick.pick).toBe('OVER');
    expect(pick.reason).toContain('Jacksonville Jaguars');
    expect(pick.reason).toContain('below the 45-point midpoint');
  });

  it('allows the midpoint to be adjusted for model tuning', () => {
    const customPick = PredictionEngine.getTotalPick(44, 42);
    const customDetails = PredictionEngine.getTotalPickDetails(44, 'Jacksonville Jaguars', 42);

    expect(customPick).toBe('UNDER');
    expect(customDetails.reason).toContain('42-point midpoint');
  });

  it('builds a simple team strength rating from historical game results', () => {
    const games = [
      new NFLGame({
        week: '1', date: '2025-09-07', team1: 'Kansas City Chiefs', team2: 'Baltimore Ravens', team1Score: 28, team2Score: 21, totalLine: 45.5,
      }),
      new NFLGame({
        week: '2', date: '2025-09-14', team1: 'Kansas City Chiefs', team2: 'Cincinnati Bengals', team1Score: 31, team2Score: 17, totalLine: 47.5,
      }),
      new NFLGame({
        week: '1', date: '2025-09-08', team1: 'Baltimore Ravens', team2: 'Las Vegas Raiders', team1Score: 14, team2Score: 19, totalLine: 43.5,
      }),
    ];

    const ratings = new TeamStrengthService().buildRatings(games);

    expect(ratings['Kansas City Chiefs']).toBeGreaterThan(ratings['Baltimore Ravens']);
    expect(ratings['Kansas City Chiefs']).toBeGreaterThanOrEqual(6);
    expect(ratings['Baltimore Ravens']).toBeGreaterThanOrEqual(1);
    expect(ratings['Las Vegas Raiders']).toBeGreaterThanOrEqual(2);
  });
});
