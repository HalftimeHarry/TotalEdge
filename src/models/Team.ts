export interface TeamParams {
  name: string;
  market?: string;
  nickname?: string;
  abbreviation?: string;
  wins: number;
  losses: number;
  ties: number;
  winLossPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  marginOfVictory: number;
  strengthOfSchedule: number;
  simpleRatingSystem: number;
  offenseSrs: number;
  defenseSrs: number;
  playoffMarker?: string;
}

export class Team {
  public readonly name: string;
  public readonly market: string;
  public readonly nickname: string;
  public readonly abbreviation: string;
  public readonly wins: number;
  public readonly losses: number;
  public readonly ties: number;
  public readonly winLossPct: number;
  public readonly pointsFor: number;
  public readonly pointsAgainst: number;
  public readonly pointDifferential: number;
  public readonly marginOfVictory: number;
  public readonly strengthOfSchedule: number;
  public readonly simpleRatingSystem: number;
  public readonly offenseSrs: number;
  public readonly defenseSrs: number;
  public readonly playoffMarker: string;

  constructor({
    name,
    market,
    nickname,
    abbreviation,
    wins,
    losses,
    ties,
    winLossPct,
    pointsFor,
    pointsAgainst,
    pointDifferential,
    marginOfVictory,
    strengthOfSchedule,
    simpleRatingSystem,
    offenseSrs,
    defenseSrs,
    playoffMarker = '',
  }: TeamParams) {
    this.name = name;
    this.market = market ?? name.split(' ').slice(0, -1).join(' ');
    this.nickname = nickname ?? name.split(' ').slice(-1)[0];
    this.abbreviation = abbreviation ?? this.nickname.slice(0, 3).toUpperCase();
    this.wins = wins;
    this.losses = losses;
    this.ties = ties;
    this.winLossPct = winLossPct;
    this.pointsFor = pointsFor;
    this.pointsAgainst = pointsAgainst;
    this.pointDifferential = pointDifferential;
    this.marginOfVictory = marginOfVictory;
    this.strengthOfSchedule = strengthOfSchedule;
    this.simpleRatingSystem = simpleRatingSystem;
    this.offenseSrs = offenseSrs;
    this.defenseSrs = defenseSrs;
    this.playoffMarker = playoffMarker;
  }

  public get isPlayoffTeam(): boolean {
    return this.playoffMarker !== '';
  }

  public get record(): string {
    return `${this.wins}-${this.losses}${this.ties > 0 ? `-${this.ties}` : ''}`;
  }

  public static fromCsvRow(row: string): Team {
    const cells = row.split(',');

    if (cells.length < 13) {
      throw new Error(`Invalid team CSV row: ${row}`);
    }

    const [rawName, wins, losses, ties, winLossPct, pointsFor, pointsAgainst, pointDifferential, marginOfVictory, strengthOfSchedule, simpleRatingSystem, offenseSrs, defenseSrs] = cells;

    const cleanedName = rawName.replace(/[\*\+]$/, '').trim();
    const playoffMarker = rawName.endsWith('+') ? '+' : rawName.endsWith('*') ? '*' : '';

    return new Team({
      name: cleanedName,
      wins: Number(wins),
      losses: Number(losses),
      ties: Number(ties),
      winLossPct: Number(winLossPct),
      pointsFor: Number(pointsFor),
      pointsAgainst: Number(pointsAgainst),
      pointDifferential: Number(pointDifferential),
      marginOfVictory: Number(marginOfVictory),
      strengthOfSchedule: Number(strengthOfSchedule),
      simpleRatingSystem: Number(simpleRatingSystem),
      offenseSrs: Number(offenseSrs),
      defenseSrs: Number(defenseSrs),
      playoffMarker,
    });
  }
}
