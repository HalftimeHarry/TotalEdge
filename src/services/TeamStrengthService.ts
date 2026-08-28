import { NFLGame } from '../models/NFLGame';
import { normalizeTeamName } from '../models/TeamRegistry';

export interface TeamStrengthSummary {
  team: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  averageMargin: number;
  rating: number;
}

interface TeamStrengthAccumulator {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}

export class TeamStrengthService {
  public buildRatings(games: NFLGame[]): Record<string, number> {
    const summaries = this.buildSummaries(games);
    const ratings: Record<string, number> = {};

    for (const summary of summaries) {
      ratings[summary.team] = Number(summary.rating.toFixed(1));
    }

    return ratings;
  }

  public buildSummaries(games: NFLGame[]): TeamStrengthSummary[] {
    const teamStats = new Map<string, TeamStrengthAccumulator>();

    for (const game of games) {
      const team1 = normalizeTeamName(game.team1);
      const team2 = normalizeTeamName(game.team2);

      if (!team1 || !team2) {
        continue;
      }

      this.recordGame(teamStats, team1, game.team1Score, game.team2Score, true);
      this.recordGame(teamStats, team2, game.team2Score, game.team1Score, false);
    }

    return Array.from(teamStats.entries())
      .map(([team, stats]) => {
        const gamesPlayed = Math.max(1, stats.wins + stats.losses);
        const winRate = stats.wins / gamesPlayed;
        const averageMargin = stats.pointDifferential / gamesPlayed;
        const pointsGap = stats.pointsFor - stats.pointsAgainst;

        const rating = this.clamp(
          5 + (winRate * 3) + (averageMargin / 6) + (pointsGap / 24),
          1,
          10,
        );

        return {
          team,
          wins: stats.wins,
          losses: stats.losses,
          pointsFor: stats.pointsFor,
          pointsAgainst: stats.pointsAgainst,
          pointDifferential: stats.pointDifferential,
          averageMargin,
          rating,
        };
      })
      .sort((left, right) => right.rating - left.rating);
  }

  public getTeamRating(games: NFLGame[], teamName: string): number {
    const normalizedTeam = normalizeTeamName(teamName);
    const ratings = this.buildRatings(games);
    return ratings[normalizedTeam] ?? 5;
  }

  private recordGame(
    teamStats: Map<string, TeamStrengthAccumulator>,
    team: string,
    teamScore: number,
    opponentScore: number,
    isTeam1: boolean,
  ): void {
    const existing = teamStats.get(team) ?? {
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
    };

    existing.pointsFor += teamScore;
    existing.pointsAgainst += opponentScore;
    existing.pointDifferential += teamScore - opponentScore;

    if (teamScore > opponentScore) {
      existing.wins += 1;
    } else if (teamScore < opponentScore) {
      existing.losses += 1;
    }

    if (isTeam1) {
      teamStats.set(team, existing);
    } else {
      teamStats.set(team, existing);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
