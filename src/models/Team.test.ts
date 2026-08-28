import { describe, expect, it } from 'vitest';
import { Team } from './Team';

describe('Team', () => {
  it('parses a season CSV row into the normalized team model', () => {
    const team = Team.fromCsvRow('New England Patriots*,14,3,0,.824,490,320,170,10.0,-4.5,5.5,3.7,1.8');

    expect(team.name).toBe('New England Patriots');
    expect(team.playoffMarker).toBe('*');
    expect(team.wins).toBe(14);
    expect(team.losses).toBe(3);
    expect(team.ties).toBe(0);
    expect(team.winLossPct).toBe(0.824);
    expect(team.pointsFor).toBe(490);
    expect(team.pointsAgainst).toBe(320);
    expect(team.pointDifferential).toBe(170);
    expect(team.marginOfVictory).toBe(10);
    expect(team.strengthOfSchedule).toBe(-4.5);
    expect(team.simpleRatingSystem).toBe(5.5);
    expect(team.offenseSrs).toBe(3.7);
    expect(team.defenseSrs).toBe(1.8);
    expect(team.isPlayoffTeam).toBe(true);
  });
});
