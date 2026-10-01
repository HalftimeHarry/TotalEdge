import { NFLGame } from '../models/NFLGame';
import { PredictionEngine } from './PredictionEngine';

export interface BacktestResult {
  midpoint: number;
  games: number;
  wins: number;
  losses: number;
  pushes: number;
  accuracy: number;
}

export class BacktestService {
  public evaluateMidpoints(games: NFLGame[], midpoints: number[]): BacktestResult[] {
    return midpoints
      .filter((midpoint) => Number.isFinite(midpoint))
      .map((midpoint) => this.evaluateMidpoint(games, midpoint))
      .sort((left, right) => right.accuracy - left.accuracy || right.wins - left.wins || left.midpoint - right.midpoint);
  }

  private evaluateMidpoint(games: NFLGame[], midpoint: number): BacktestResult {
    let wins = 0;
    let losses = 0;
    let pushes = 0;

    for (const game of games) {
      if (game.totalLine === null) {
        continue;
      }

      const pick = PredictionEngine.getTotalPick(game.totalLine, midpoint);
      const result = game.getResult();

      if (result === 'PUSH') {
        pushes += 1;
      } else if (pick === result) {
        wins += 1;
      } else {
        losses += 1;
      }
    }

    const gamesWithDecisions = wins + losses;

    return {
      midpoint,
      games: gamesWithDecisions + pushes,
      wins,
      losses,
      pushes,
      accuracy: gamesWithDecisions === 0 ? 0 : wins / gamesWithDecisions,
    };
  }
}