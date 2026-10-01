import { describe, expect, it } from 'vitest';
import { CsvImporter } from './CsvImporter';

describe('CsvImporter', () => {
  it('normalizes team names and leaves the line empty until later manual entry', () => {
    const csv = [
      'Week,Date,Team 1,Team 2,Score 1,Score 2,Total Line',
      'Week 1,2024-09-05,KC,BUF,27,24,',
      'Week 1,2024-09-08,NE,MIA,10,17,',
    ].join('\n');

    const games = new CsvImporter().importFromText(csv);

    expect(games).toHaveLength(2);
    expect(games[0].team1).toBe('Kansas City Chiefs');
    expect(games[0].team2).toBe('Buffalo Bills');
    expect(games[0].totalLine).toBeNull();
    expect(games[1].team1).toBe('New England Patriots');
    expect(games[1].team2).toBe('Miami Dolphins');
  });

  it('supports importing a single week at a time', () => {
    const csv = [
      'Week,Date,Team 1,Team 2,Score 1,Score 2',
      'Week 2,2024-09-12,PHI,ATL,31,27',
      'Week 2,2024-09-13,CIN,BAL,17,21',
    ].join('\n');

    const games = new CsvImporter().importFromText(csv, 'Week 2');

    expect(games).toHaveLength(2);
    expect(games.every((game) => game.week === 'Week 2')).toBe(true);
  });

  it('supports the real historical results CSV format with winner/loser and score columns', () => {
    const csv = [
      'Week,Day,Date,Time,Winner/tie,,Loser/tie,Date,Pts,Pts,YdsW,TOW,YdsL,TOL',
      '1,Thu,2025-09-04,8:20PM,Philadelphia Eagles,,Dallas Cowboys,boxscore,24,20,302,0,307,1',
      '1,Sun,2025-09-07,1:00PM,Tampa Bay Buccaneers,@,Atlanta Falcons,boxscore,23,20,260,0,358,0',
    ].join('\n');

    const games = new CsvImporter().importFromText(csv);

    expect(games).toHaveLength(2);
    expect(games[0].week).toBe('1');
    expect(games[0].team1).toBe('Philadelphia Eagles');
    expect(games[0].team2).toBe('Dallas Cowboys');
    expect(games[0].team1Score).toBe(24);
    expect(games[0].team2Score).toBe(20);
    expect(games[1].team1).toBe('Tampa Bay Buccaneers');
    expect(games[1].team2).toBe('Atlanta Falcons');
    expect(games[1].team1Score).toBe(23);
    expect(games[1].team2Score).toBe(20);
  });

  it('imports a Google Sheets scoreboard with metadata rows before the header', () => {
    const csv = [
      'Week 3,data last refreshed:,,,,',
      '<- games in play,,,,',
      'Wed 12:34 PM,Date,Time,Away Team,Away,Home Team,Home,Away Score,Home Score,Qtr,Clock,Situation,Pos,Score,Total Points,O/U,Odds,Broadcast',
      'Week 3,Thu 09/24/2026,8:15 PM,Falcons,ATL,Packers,GB,35,14,F,0:00,game over,,ATL 35 GB 14 (F),49,42.5,GB -4.5,Prime Video',
    ].join('\n');

    const games = new CsvImporter().importFromText(csv);

    expect(games).toHaveLength(1);
    expect(games[0].week).toBe('Week 3');
    expect(games[0].team1).toBe('Atlanta Falcons');
    expect(games[0].team2).toBe('Green Bay Packers');
    expect(games[0].team1Score).toBe(35);
    expect(games[0].team2Score).toBe(14);
    expect(games[0].totalLine).toBe(42.5);
  });
});
