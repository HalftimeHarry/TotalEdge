const TEAM_ALIASES: Record<string, string> = {
  ARI: 'Arizona Cardinals',
  'ARIZONA CARDINALS': 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  'ATLANTA FALCONS': 'Atlanta Falcons',
  'ATL FALCONS': 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  'BALTIMORE RAVENS': 'Baltimore Ravens',
  'BAL RAVENS': 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  'BUFFALO BILLS': 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  'CAROLINA PANTHERS': 'Carolina Panthers',
  CHI: 'Chicago Bears',
  'CHICAGO BEARS': 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  'CINCINNATI BENGALS': 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  'CLEVELAND BROWNS': 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  'DALLAS COWBOYS': 'Dallas Cowboys',
  'DAL COWBOYS': 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  'DENVER BRONCOS': 'Denver Broncos',
  'DEN BRONCOS': 'Denver Broncos',
  DET: 'Detroit Lions',
  'DETROIT LIONS': 'Detroit Lions',
  GB: 'Green Bay Packers',
  GNB: 'Green Bay Packers',
  'GREEN BAY PACKERS': 'Green Bay Packers',
  'GB PACKERS': 'Green Bay Packers',
  HOU: 'Houston Texans',
  'HOUSTON TEXANS': 'Houston Texans',
  IND: 'Indianapolis Colts',
  'INDIANAPOLIS COLTS': 'Indianapolis Colts',
  'IND COLTS': 'Indianapolis Colts',
  JAC: 'Jacksonville Jaguars',
  JAX: 'Jacksonville Jaguars',
  'JACKSONVILLE JAGUARS': 'Jacksonville Jaguars',
  'JAC JAGUARS': 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  KAN: 'Kansas City Chiefs',
  'KANSAS CITY CHIEFS': 'Kansas City Chiefs',
  LAC: 'Los Angeles Chargers',
  'LOS ANGELES CHARGERS': 'Los Angeles Chargers',
  'LA CHARGERS': 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  'LOS ANGELES RAMS': 'Los Angeles Rams',
  'LA RAMS': 'Los Angeles Rams',
  LV: 'Las Vegas Raiders',
  'LAS VEGAS RAIDERS': 'Las Vegas Raiders',
  'LV RAIDERS': 'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  'MIAMI DOLPHINS': 'Miami Dolphins',
  'MIA DOLPHINS': 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  'MINNESOTA VIKINGS': 'Minnesota Vikings',
  'MIN VIKINGS': 'Minnesota Vikings',
  NE: 'New England Patriots',
  'NEW ENGLAND PATRIOTS': 'New England Patriots',
  'NE PATRIOTS': 'New England Patriots',
  NO: 'New Orleans Saints',
  'NEW ORLEANS SAINTS': 'New Orleans Saints',
  'NO SAINTS': 'New Orleans Saints',
  NYG: 'New York Giants',
  'NEW YORK GIANTS': 'New York Giants',
  'NY GIANTS': 'New York Giants',
  NYJ: 'New York Jets',
  'NEW YORK JETS': 'New York Jets',
  'NY JETS': 'New York Jets',
  PHI: 'Philadelphia Eagles',
  'PHILADELPHIA EAGLES': 'Philadelphia Eagles',
  'PHI EAGLES': 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  'PITTSBURGH STEELERS': 'Pittsburgh Steelers',
  'PIT STEELERS': 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  'SEATTLE SEAHAWKS': 'Seattle Seahawks',
  'SEA SEAHAWKS': 'Seattle Seahawks',
  SF: 'San Francisco 49ers',
  SFO: 'San Francisco 49ers',
  'SAN FRANCISCO 49ERS': 'San Francisco 49ers',
  TB: 'Tampa Bay Buccaneers',
  'TAMPA BAY BUCCANEERS': 'Tampa Bay Buccaneers',
  'TAM BUCCANEERS': 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  'TENNESSEE TITANS': 'Tennessee Titans',
  'TEN TITANS': 'Tennessee Titans',
  WSH: 'Washington Commanders',
  WAS: 'Washington Commanders',
  'WASHINGTON COMMANDERS': 'Washington Commanders',
  'WAS COMMANDERS': 'Washington Commanders',
  'WASHINGTON FOOTBALL TEAM': 'Washington Commanders',
};

export const TEAM_NAMES = [...new Set(Object.values(TEAM_ALIASES))].sort();

export function normalizeTeamName(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const upper = trimmed.toUpperCase();
  const directMatch = TEAM_ALIASES[upper] ?? TEAM_ALIASES[trimmed];

  if (directMatch) {
    return directMatch;
  }

  const normalizedParts = trimmed.split(/\s+/).filter(Boolean);
  if (normalizedParts.length > 1) {
    const combinedKey = normalizedParts.map((part) => part.toUpperCase()).join(' ');
    const combinedMatch = TEAM_ALIASES[combinedKey];

    if (combinedMatch) {
      return combinedMatch;
    }

    const abbreviation = normalizedParts[0].toUpperCase();
    const remainder = normalizedParts.slice(1).join(' ').toUpperCase();
    const abbreviationMatch = TEAM_ALIASES[abbreviation] ?? TEAM_ALIASES[remainder];

    if (abbreviationMatch) {
      return abbreviationMatch;
    }
  }

  const compactKey = upper.replace(/[^A-Z0-9]/g, '');
  const compactMatch = Object.entries(TEAM_ALIASES).find(([key]) => key.replace(/[^A-Z0-9]/g, '') === compactKey);

  if (compactMatch) {
    return compactMatch[1];
  }

  const normalizedWords = trimmed
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z])\b/g, (match) => match.toUpperCase());

  return normalizedWords;
}
