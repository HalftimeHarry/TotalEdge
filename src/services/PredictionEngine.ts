import { Prediction } from '../models/Prediction';
import { NFLGame } from '../models/NFLGame';

export interface TotalPickDetails {
  pick: 'OVER' | 'UNDER';
  strength: 'Strong' | 'Moderate' | 'Weak';
  reason: string;
  rating: number;
}

export type HalftimeHedgeSide = 'OVER' | 'UNDER';
export type HalftimeHedgeResult = 'BUTTER_ZONE' | 'MODERATE_WIN' | 'PUSH' | 'BROWN_ZONE' | 'WAITING_FOR_LINE';

export interface HalftimeHedgeRequest {
  totalLine: number;
  halftimeTotal: number;
  originalSide: HalftimeHedgeSide;
  stake: number;
  midpoint?: number;
  juice?: number | string;
  secondHalfLine?: number | null;
}

export interface HalftimeHedgePlan {
  result: HalftimeHedgeResult;
  hedgeSide: HalftimeHedgeSide;
  hedgePercent: number;
  hedgeStake: number;
  targetHalfTotal: number;
  paceDeviation: number;
  originalSide: HalftimeHedgeSide;
  stake: number;
  juice: number;
  totalLine: number;
  halftimeTotal: number;
  sportsbookSecondHalfLine?: number | null;
  projectedSecondHalfTotal?: number;
  summary: string;
}

export class PredictionEngine {
  public static getTotalPick(totalLine: number | null, midpoint = 45): 'OVER' | 'UNDER' | 'PUSH' {
    if (totalLine === null) {
      return 'PUSH';
    }

    const lowThreshold = midpoint - 1.5;
    const highThreshold = midpoint + 1.5;

    if (totalLine <= lowThreshold) {
      return 'OVER';
    }

    if (totalLine >= highThreshold) {
      return 'UNDER';
    }

    return totalLine > midpoint ? 'UNDER' : 'OVER';
  }

  public static getTotalPickDetails(totalLine: number | null, matchup?: string, midpoint = 45): TotalPickDetails {
    const pick = PredictionEngine.getTotalPick(totalLine, midpoint);

    if (pick === 'PUSH' || totalLine === null) {
      return {
        pick: 'UNDER',
        strength: 'Weak',
        reason: matchup
          ? `${matchup} has no usable total line for a reliable totals pick.`
          : 'No total line available for a totals pick.',
        rating: 0,
      };
    }

    const direction = pick === 'OVER' ? `below the ${midpoint}-point midpoint` : `above the ${midpoint}-point midpoint`;
    const strongThreshold = midpoint - 4;
    const moderateThreshold = midpoint;
    const weakThreshold = midpoint + 2;

    const strength: TotalPickDetails['strength'] = totalLine <= strongThreshold
      ? 'Strong'
      : totalLine <= moderateThreshold
        ? 'Moderate'
        : totalLine <= weakThreshold
          ? 'Weak'
          : 'Moderate';

    const rating = pick === 'OVER'
      ? (totalLine <= strongThreshold ? 9 : totalLine <= moderateThreshold ? 8 : totalLine <= weakThreshold ? 7 : 6)
      : (totalLine >= midpoint + 4 ? 9 : totalLine >= midpoint + 2 ? 8 : totalLine >= midpoint ? 7 : 6);

    const matchupText = matchup ? matchup.trim() : 'this matchup';
    const reasonBase = pick === 'OVER'
      ? `The total sits ${direction}, which gives ${matchupText} a ${strength.toLowerCase()} over angle. The market is pricing this game below a typical ${midpoint}-point script, so the scoring setup leans toward the over.`
      : `The total sits ${direction}, which gives ${matchupText} a ${strength.toLowerCase()} under angle. The market is pricing this game above a typical ${midpoint}-point script, so the scoring setup leans toward the under.`;

    return {
      pick,
      strength,
      reason: matchup ? `${matchupText}: ${reasonBase}` : reasonBase,
      rating,
    };
  }

  public static parseOdds(juice: number | string): number {
    if (typeof juice === 'number') {
      return Number.isFinite(juice) ? juice : -110;
    }

    const trimmed = String(juice).trim();
    if (!trimmed) {
      return -110;
    }

    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : -110;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : -110;
  }

  public static getLiveHalftimeTarget({
    totalLine,
    scoreTotal,
    clock,
  }: {
    totalLine: number;
    scoreTotal: number;
    clock: string;
  }): number {
    const normalizedTotal = Math.max(0, totalLine);
    const normalizedScore = Math.max(0, scoreTotal);
    const cleanedClock = clock.trim();

    const elapsedMinutes = (() => {
      if (!cleanedClock) {
        return 15;
      }

      const match = cleanedClock.match(/Q([1-4])\s+(\d{1,2}):(\d{2})/i);
      if (match) {
        const quarter = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3]);
        const elapsed = ((quarter - 1) * 15) + (15 - minutes) + (seconds / 60);
        return Math.min(60, Math.max(0, elapsed));
      }

      const fallback = Number(cleanedClock.replace(/[^\d.]/g, ''));
      return Number.isFinite(fallback) ? Math.min(60, Math.max(0, fallback)) : 15;
    })();

    const baseTarget = normalizedTotal / 2;
    const scoreGap = normalizedScore - baseTarget;
    const progress = Math.min(1, Math.max(0, elapsedMinutes / 60));
    const pacingBias = (scoreGap * (0.35 + (0.65 * (1 - progress)))) / 2;
    const liveTarget = baseTarget + pacingBias;

    return Number(Math.min(Math.max(liveTarget, 0), Math.max(10, normalizedTotal)).toFixed(1));
  }

  private static getButterZoneSizing({
    intervalWidth,
    originalSide,
  }: {
    intervalWidth: number;
    originalSide: HalftimeHedgeSide;
  }): number {
    const safeWidth = Math.max(0, intervalWidth);
    const basePercent = originalSide === 'UNDER'
      ? (safeWidth >= 20 ? 0.75 : safeWidth >= 14 ? 0.6 : safeWidth >= 8 ? 0.45 : safeWidth >= 4 ? 0.25 : 0.2)
      : (safeWidth >= 18 ? 0.7 : safeWidth >= 12 ? 0.55 : safeWidth >= 8 ? 0.4 : safeWidth >= 4 ? 0.25 : 0.2);

    return Number(basePercent.toFixed(2));
  }

  public static getLiveHalftimeSummary({
    totalLine,
    halftimeScore,
    secondHalfProjection,
    originalSide,
    juice,
    stake,
    sportsbookSecondHalfLine,
  }: {
    totalLine: number;
    halftimeScore: number;
    secondHalfProjection: number;
    originalSide: HalftimeHedgeSide;
    juice: number | string;
    stake: number;
    midpoint?: number;
    sportsbookSecondHalfLine?: number | null;
  }): HalftimeHedgePlan {
    const normalizedJuice = PredictionEngine.parseOdds(juice);
    const safeTotalLine = Math.max(0, totalLine);
    const safeHalftimeScore = Math.max(0, halftimeScore);
    const safeProjectedSecondHalf = Math.max(0, secondHalfProjection);
    const safeSecondHalfLine = typeof sportsbookSecondHalfLine === 'number' && Number.isFinite(sportsbookSecondHalfLine)
      ? Math.max(0, sportsbookSecondHalfLine)
      : null;
    const hedgeSide: HalftimeHedgeSide = originalSide === 'OVER' ? 'UNDER' : 'OVER';
    const projectedFinalTotal = safeHalftimeScore + safeProjectedSecondHalf;
    const remainingOriginalRoom = Math.max(0, safeTotalLine - safeHalftimeScore);
    const originalNeedToCash = Math.max(0, safeTotalLine - safeHalftimeScore);

    if (safeSecondHalfLine === null) {
      const juiceLabel = normalizedJuice > 0 ? `+${normalizedJuice}` : `${normalizedJuice}`;
      return {
        result: 'WAITING_FOR_LINE',
        hedgeSide,
        hedgePercent: 0,
        hedgeStake: 0,
        targetHalfTotal: 0,
        paceDeviation: 0,
        originalSide,
        stake,
        juice: normalizedJuice,
        totalLine: safeTotalLine,
        halftimeTotal: safeHalftimeScore,
        sportsbookSecondHalfLine: null,
        projectedSecondHalfTotal: safeProjectedSecondHalf,
        summary: `waiting for 2h line: the model needs the actual sportsbook second-half total before it can evaluate a true butter-zone hedge at ${juiceLabel}.`,
      };
    }

    const underDualWinStart = safeSecondHalfLine;
    const underDualWinEnd = remainingOriginalRoom;
    const overDualWinStart = originalNeedToCash;
    const overDualWinEnd = safeSecondHalfLine;

    const hasUnderButterZone = originalSide === 'UNDER'
      ? safeProjectedSecondHalf > underDualWinStart && safeProjectedSecondHalf < underDualWinEnd && underDualWinEnd > underDualWinStart
      : false;
    const hasOverButterZone = originalSide === 'OVER'
      ? safeProjectedSecondHalf > overDualWinStart && safeProjectedSecondHalf < overDualWinEnd && overDualWinEnd > overDualWinStart
      : false;

    const result: HalftimeHedgeResult = hasUnderButterZone || hasOverButterZone ? 'BUTTER_ZONE' : 'BROWN_ZONE';
    const butterZoneWidth = originalSide === 'UNDER'
      ? Math.max(0, underDualWinEnd - underDualWinStart)
      : Math.max(0, overDualWinEnd - overDualWinStart);

    const juiceBias = normalizedJuice >= 100
      ? -0.05
      : normalizedJuice <= -115
        ? 0.05
        : 0;
    const baseHedgePercent = result === 'BUTTER_ZONE'
      ? PredictionEngine.getButterZoneSizing({
        intervalWidth: butterZoneWidth,
        originalSide,
      })
      : 0;
    const hedgePercent = Number(Math.max(0, Math.min(0.75, baseHedgePercent + juiceBias)).toFixed(2));
    const hedgeStake = Number((Math.max(0, stake) * hedgePercent).toFixed(2));
    const juiceLabel = normalizedJuice > 0 ? `+${normalizedJuice}` : `${normalizedJuice}`;

    const summary = result === 'BUTTER_ZONE'
      ? originalSide === 'UNDER'
        ? `butter-zone halftime hedge: the original ${originalSide.toLowerCase()} ${safeTotalLine.toFixed(1)} still has ${remainingOriginalRoom.toFixed(1)} points of room after a ${safeHalftimeScore}-point first half. The sportsbook second-half total is ${safeSecondHalfLine.toFixed(1)}, and the model projects ${safeProjectedSecondHalf.toFixed(2)} second-half points, which keeps the final total at ${projectedFinalTotal.toFixed(2)} while the ${hedgeSide.toLowerCase()} hedge can cash above ${safeSecondHalfLine.toFixed(1)}. That creates a real dual-win window, so a ${hedgeSide.toLowerCase()} hedge at ${Math.round(hedgePercent * 100)}% of the stake with juice ${juiceLabel} is the recommended play.`
        : `butter-zone halftime hedge: the original ${originalSide.toLowerCase()} ${safeTotalLine.toFixed(1)} still needs ${originalNeedToCash.toFixed(1)} second-half points after a ${safeHalftimeScore}-point first half. The sportsbook second-half total is ${safeSecondHalfLine.toFixed(1)}, and the model projects ${safeProjectedSecondHalf.toFixed(2)} second-half points, which keeps the original ${originalSide.toLowerCase()} alive while the ${hedgeSide.toLowerCase()} hedge can cash below ${safeSecondHalfLine.toFixed(1)}. That creates a real dual-win window, so a ${hedgeSide.toLowerCase()} hedge at ${Math.round(hedgePercent * 100)}% of the stake with juice ${juiceLabel} is the recommended play.`
      : `do not bet — hold original position: the original ${originalSide.toLowerCase()} is already the stronger position after a ${safeHalftimeScore}-point first half. The model does not see a meaningful dual-win range against the sportsbook second-half line of ${safeSecondHalfLine.toFixed(1)}, so it recommends holding the original wager and not forcing a hedge at juice ${juiceLabel}.`;

    return {
      result,
      hedgeSide,
      hedgePercent,
      hedgeStake,
      targetHalfTotal: safeSecondHalfLine,
      paceDeviation: Math.abs(safeProjectedSecondHalf - safeSecondHalfLine),
      originalSide,
      stake,
      juice: normalizedJuice,
      totalLine: safeTotalLine,
      halftimeTotal: safeHalftimeScore,
      sportsbookSecondHalfLine: safeSecondHalfLine,
      projectedSecondHalfTotal: safeProjectedSecondHalf,
      summary,
    };
  }

  public static getHalftimeHedge({
    totalLine,
    halftimeTotal,
    originalSide,
    stake,
    juice = -110,
    secondHalfLine,
  }: HalftimeHedgeRequest): HalftimeHedgePlan {
    return PredictionEngine.getLiveHalftimeSummary({
      totalLine,
      halftimeScore: halftimeTotal,
      secondHalfProjection: Math.max(0, totalLine / 2),
      originalSide,
      stake,
      juice,
      sportsbookSecondHalfLine: secondHalfLine ?? null,
    });
  }

  public generatePredictions(games: NFLGame[]): Prediction[] {
    return games.map((game) => {
      if (game.totalLine === null) {
        return new Prediction(game, 'NO TOTAL LINE', 'Total line unavailable in CSV; prediction skipped.');
      }

      const actualTotal = game.getTotalScore();
      const line = game.totalLine;

      if (actualTotal > line) {
        return new Prediction(
          game,
          'BET OVER',
          `Historical total ${actualTotal} > ${line}; the game went over the total line.`,
        );
      }

      if (actualTotal < line) {
        return new Prediction(
          game,
          'BET UNDER',
          `Historical total ${actualTotal} < ${line}; the game stayed under the total line.`,
        );
      }

      return new Prediction(
        game,
        'PUSH',
        `Historical total ${actualTotal} landed exactly on ${line}; the total was a push.`,
      );
    });
  }
}
