import { NFLGame } from '../models/NFLGame';

interface ColumnMap {
  weekIndex: number;
  dateIndex: number;
  team1Index: number;
  team2Index: number;
  team1ScoreIndex: number;
  team2ScoreIndex: number;
  totalLineIndex: number | null;
}

// Source CSV has duplicate header names; these required fields are mapped by known positions.
const REQUIRED_COLUMN_INDEXES = {
  week: 0,
  date: 2,
  team1: 4,
  team2: 6,
  team1Score: 8,
  team2Score: 9,
} as const;

export class CsvImporter {
  public importFromText(csvText: string): NFLGame[] {
    const rows = this.parseRows(csvText);

    if (rows.length < 2) {
      return [];
    }

    const columnMap = this.getColumnMap(rows[0]);
    const games: NFLGame[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const game = this.mapRowToGame(row, columnMap);

      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  private mapRowToGame(row: string[], map: ColumnMap): NFLGame | null {
    const week = this.readValue(row, map.weekIndex);
    const date = this.readValue(row, map.dateIndex);
    const team1 = this.readValue(row, map.team1Index);
    const team2 = this.readValue(row, map.team2Index);
    const team1Score = this.parseNumber(this.readValue(row, map.team1ScoreIndex));
    const team2Score = this.parseNumber(this.readValue(row, map.team2ScoreIndex));

    if (!week || !date || !team1 || !team2 || team1Score === null || team2Score === null) {
      return null;
    }

    const totalLineValue = map.totalLineIndex === null ? null : this.parseNumber(this.readValue(row, map.totalLineIndex));

    return new NFLGame({
      week,
      date,
      team1,
      team2,
      team1Score,
      team2Score,
      totalLine: totalLineValue,
    });
  }

  private getColumnMap(headers: string[]): ColumnMap {
    const totalLineIndex = headers.findIndex((header) => {
      const normalizedHeader = header.trim().toLowerCase();

      return normalizedHeader === 'total line'
        || normalizedHeader === 'totalline'
        || normalizedHeader === 'closing total'
        || normalizedHeader === 'closing_total'
        || normalizedHeader === 'ou line'
        || normalizedHeader === 'over/under';
    });

    return {
      weekIndex: REQUIRED_COLUMN_INDEXES.week,
      dateIndex: REQUIRED_COLUMN_INDEXES.date,
      team1Index: REQUIRED_COLUMN_INDEXES.team1,
      team2Index: REQUIRED_COLUMN_INDEXES.team2,
      team1ScoreIndex: REQUIRED_COLUMN_INDEXES.team1Score,
      team2ScoreIndex: REQUIRED_COLUMN_INDEXES.team2Score,
      totalLineIndex: totalLineIndex >= 0 ? totalLineIndex : null,
    };
  }

  private readValue(row: string[], index: number): string {
    return row[index]?.trim() ?? '';
  }

  private parseNumber(value: string): number | null {
    if (!value) {
      return null;
    }

    const parsedNumber = Number(value);

    if (!Number.isFinite(parsedNumber)) {
      return null;
    }

    return parsedNumber;
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
