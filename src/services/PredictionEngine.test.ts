import { describe, expect, it } from 'vitest';
import { NFLGame } from '../models/NFLGame';
import { PredictionEngine } from './PredictionEngine';

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
});
