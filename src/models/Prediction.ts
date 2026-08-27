import { NFLGame } from './NFLGame';

export class Prediction {
  public readonly game: NFLGame;
  public readonly recommendation: string;
  public readonly rationale: string;

  constructor(game: NFLGame, recommendation: string, rationale: string) {
    this.game = game;
    this.recommendation = recommendation;
    this.rationale = rationale;
  }
}
