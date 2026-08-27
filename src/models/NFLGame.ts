export type GameResult = 'OVER' | 'UNDER' | 'PUSH' | 'NO_LINE';

interface NFLGameParams {
  week: string;
  date: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  totalLine?: number | null;
}

export class NFLGame {
  public readonly week: string;
  public readonly date: string;
  public readonly team1: string;
  public readonly team2: string;
  public readonly team1Score: number;
  public readonly team2Score: number;
  public readonly totalLine: number | null;

  constructor({ week, date, team1, team2, team1Score, team2Score, totalLine = null }: NFLGameParams) {
    this.week = week;
    this.date = date;
    this.team1 = team1;
    this.team2 = team2;
    this.team1Score = team1Score;
    this.team2Score = team2Score;
    this.totalLine = totalLine;
  }

  public getTotalScore(): number {
    return this.team1Score + this.team2Score;
  }

  public getDifference(): number | null {
    if (this.totalLine === null) {
      return null;
    }

    return this.getTotalScore() - this.totalLine;
  }

  public getResult(): GameResult {
    const difference = this.getDifference();

    if (difference === null) {
      return 'NO_LINE';
    }

    if (difference > 0) {
      return 'OVER';
    }

    if (difference < 0) {
      return 'UNDER';
    }

    return 'PUSH';
  }

  public getMatchup(): string {
    return `${this.team1} vs ${this.team2}`;
  }
}
