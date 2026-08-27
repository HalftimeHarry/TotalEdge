import { Prediction } from '../models/Prediction';
import { NFLGame } from '../models/NFLGame';

export class PredictionEngine {
  public generatePredictions(games: NFLGame[]): Prediction[] {
    return games.map((game) => {
      if (game.totalLine === null) {
        return new Prediction(game, 'NO TOTAL LINE', 'Total line unavailable in CSV; prediction skipped.');
      }

      const result = game.getResult();

      return new Prediction(
        game,
        `HISTORICAL ${result}`,
        'Baseline output uses historical total vs. sportsbook line. Prediction formulas will be added later.',
      );
    });
  }
}
