import { Prediction } from '../models/Prediction';
import { NFLGame } from '../models/NFLGame';

export interface TotalPickDetails {
  pick: 'OVER' | 'UNDER';
  strength: 'Strong' | 'Moderate' | 'Weak';
  reason: string;
  rating: number;
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
