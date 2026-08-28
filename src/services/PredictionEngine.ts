import { Prediction } from '../models/Prediction';
import { NFLGame } from '../models/NFLGame';

export interface TotalPickDetails {
  pick: 'OVER' | 'UNDER';
  strength: 'Strong' | 'Moderate' | 'Weak';
  reason: string;
  rating: number;
}

export class PredictionEngine {
  public static getTotalPick(totalLine: number | null): 'OVER' | 'UNDER' | 'PUSH' {
    if (totalLine === null) {
      return 'PUSH';
    }

    if (totalLine <= 43.5) {
      return 'OVER';
    }

    if (totalLine >= 47.5) {
      return 'UNDER';
    }

    return totalLine > 45 ? 'UNDER' : 'OVER';
  }

  public static getTotalPickDetails(totalLine: number | null): TotalPickDetails {
    const pick = PredictionEngine.getTotalPick(totalLine);

    if (pick === 'PUSH' || totalLine === null) {
      return {
        pick: 'UNDER',
        strength: 'Weak',
        reason: 'No total line available for a totals pick.',
        rating: 0,
      };
    }

    const direction = pick === 'OVER' ? 'below the 45-point midpoint' : 'above the 45-point midpoint';
    const strength: TotalPickDetails['strength'] = totalLine <= 41
      ? 'Strong'
      : totalLine <= 45
        ? 'Moderate'
        : totalLine <= 47
          ? 'Weak'
          : 'Moderate';

    const rating = pick === 'OVER'
      ? (totalLine <= 41 ? 9 : totalLine <= 45 ? 8 : totalLine <= 47 ? 7 : 6)
      : (totalLine >= 49 ? 9 : totalLine >= 47 ? 8 : totalLine >= 45 ? 7 : 6);

    return {
      pick,
      strength,
      reason: `This total sits ${direction}, which makes it a ${strength.toLowerCase()} ${pick.toLowerCase()} angle based on the market midpoint.`,
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
