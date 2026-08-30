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

  it('waits for the sportsbook 2h line before calling a butter-zone hedge', () => {
    const plan = PredictionEngine.getHalftimeHedge({
      totalLine: 44,
      halftimeTotal: 22,
      originalSide: 'OVER',
      stake: 100,
      midpoint: 45,
      secondHalfLine: null,
    });

    expect(plan.result).toBe('WAITING_FOR_LINE');
    expect(plan.hedgeSide).toBe('UNDER');
    expect(plan.hedgePercent).toBe(0);
    expect(plan.summary).toContain('waiting for 2h line');
  });

  it('uses the sportsbook 2h line to keep the original position unless a real dual-win window exists', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 46,
      halftimeScore: 27,
      secondHalfProjection: 12,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    expect(plan.result).toBe('BROWN_ZONE');
    expect(plan.hedgeSide).toBe('OVER');
    expect(plan.summary).toContain('hold original position');
  });

  it('identifies a strong butter zone for an original under with room to spare', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 48,
      halftimeScore: 8,
      secondHalfProjection: 24,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    expect(plan.result).toBe('BUTTER_ZONE');
    expect(plan.summary).toContain('butter-zone');
    expect(plan.hedgePercent).toBeGreaterThan(0.5);
  });

  it('treats a later halftime under as a weaker, narrower butter zone than early halftime under', () => {
    const earlyPlan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 48,
      halftimeScore: 8,
      secondHalfProjection: 24,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    const laterPlan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 48,
      halftimeScore: 19,
      secondHalfProjection: 24,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    expect(earlyPlan.result).toBe('BUTTER_ZONE');
    expect(laterPlan.result).toBe('BUTTER_ZONE');
    expect(earlyPlan.hedgePercent).toBeGreaterThan(laterPlan.hedgePercent);
  });

  it('accepts a true dual-win over hedge when the sportsbook line still leaves enough room to win both', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 40.5,
      halftimeScore: 34,
      secondHalfProjection: 20.25,
      originalSide: 'OVER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 24,
    });

    expect(plan.result).toBe('BUTTER_ZONE');
    expect(plan.summary).toContain('butter-zone');
    expect(plan.hedgeSide).toBe('UNDER');
    expect(plan.hedgePercent).toBeGreaterThan(0);
  });

  it('waits for the sportsbook second-half line before recommending a hedge', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 48,
      halftimeScore: 8,
      secondHalfProjection: 24,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: null,
    });

    expect(plan.result).toBe('WAITING_FOR_LINE');
    expect(plan.summary).toContain('waiting for 2h line');
    expect(plan.hedgePercent).toBe(0);
  });

  it('does not recommend a hedge when there is no dual-win interval', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 48,
      halftimeScore: 8,
      secondHalfProjection: 10,
      originalSide: 'UNDER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    expect(plan.result).toBe('BROWN_ZONE');
    expect(plan.hedgePercent).toBe(0);
  });

  it('parses sportsbook odds strings like -110 and +100 for the halftime hedge', () => {
    const underPlan = PredictionEngine.getHalftimeHedge({
      totalLine: 44,
      halftimeTotal: 22,
      originalSide: 'OVER',
      stake: 100,
      midpoint: 45,
      juice: '-110',
      secondHalfLine: 21,
    });

    const overPlan = PredictionEngine.getHalftimeHedge({
      totalLine: 44,
      halftimeTotal: 22,
      originalSide: 'UNDER',
      stake: 100,
      midpoint: 45,
      juice: '+100',
      secondHalfLine: 21,
    });

    expect(underPlan.juice).toBe(-110);
    expect(overPlan.juice).toBe(100);
    expect(underPlan.summary).toContain('-110');
    expect(overPlan.summary).toContain('+100');
  });

  it('uses a live halftime target based on score and clock instead of a flat half-line default', () => {
    const earlyGame = PredictionEngine.getLiveHalftimeTarget({ totalLine: 44, scoreTotal: 17, clock: 'Q2 05:00' });
    const lateGame = PredictionEngine.getLiveHalftimeTarget({ totalLine: 44, scoreTotal: 31, clock: 'Q4 02:00' });

    expect(earlyGame).toBeGreaterThan(18);
    expect(earlyGame).toBeLessThan(23);
    expect(lateGame).toBeGreaterThan(earlyGame);
  });

  it('marks a wide miss as a brown-zone loss with no real hedge value', () => {
    const plan = PredictionEngine.getLiveHalftimeSummary({
      totalLine: 44,
      halftimeScore: 16,
      secondHalfProjection: 7,
      originalSide: 'OVER',
      stake: 100,
      juice: '-110',
      sportsbookSecondHalfLine: 18.5,
    });

    expect(plan.result).toBe('BROWN_ZONE');
    expect(plan.hedgeSide).toBe('UNDER');
    expect(plan.summary).toContain('hold original position');
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
