import { Team } from '../models/Team';

export class TeamService {
  public importFromText(csvText: string): Team[] {
    const rows = this.parseRows(csvText);

    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const dataRows = rows.slice(1);
    const teams: Team[] = [];

    for (const row of dataRows) {
      if (row.every((cell) => cell.trim() === '')) {
        continue;
      }

      if (!this.isTeamRow(row, headers)) {
        continue;
      }

      try {
        const team = Team.fromCsvRow(row.join(','));
        teams.push(team);
      } catch {
        // Ignore malformed rows if the table contains commentary or blank lines.
      }
    }

    return teams;
  }

  private isTeamRow(row: string[], headers: string[]): boolean {
    if (row.length < 13) {
      return false;
    }

    const nameCell = row[0]?.trim() ?? '';

    if (!nameCell) {
      return false;
    }

    const teamHeaderPresent = headers.includes('tm') || headers.includes('team') || headers.includes('team name');
    return teamHeaderPresent && /[a-z]/i.test(nameCell);
  }

  private parseRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentCell = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
      const character = csvText[i];
      const nextCharacter = csvText[i + 1];

      if (character === '"') {
        if (inQuotes && nextCharacter === '"') {
          currentCell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (character === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
        continue;
      }

      if ((character === '\n' || character === '\r') && !inQuotes) {
        if (character === '\r' && nextCharacter === '\n') {
          i += 1;
        }

        currentRow.push(currentCell);
        currentCell = '';

        if (currentRow.some((value) => value.trim() !== '')) {
          rows.push(currentRow);
        }

        currentRow = [];
        continue;
      }

      currentCell += character;
    }

    if (inQuotes) {
      return rows;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.some((value) => value.trim() !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }
}
