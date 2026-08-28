import { NFLGame } from '../models/NFLGame';
import { normalizeTeamName } from '../models/TeamRegistry';

interface ColumnMap {
  weekIndex: number;
  dateIndex: number;
  team1Index: number;
  team2Index: number;
  team1ScoreIndex: number;
  team2ScoreIndex: number;
  totalLineIndex: number | null;
}

const REQUIRED_COLUMN_INDEXES = {
  week: 0,
  date: 1,
  team1: 2,
  team2: 3,
  team1Score: 4,
  team2Score: 5,
};

export class CsvImporter {
  public importFromText(csvText: string, selectedWeek?: string): NFLGame[] {
    const rows = this.parseRows(csvText);

    if (rows.length < 2) {
      return [];
    }

    const columnMap = this.getColumnMap(rows[0]);
    const games: NFLGame[] = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const game = this.mapRowToGame(row, columnMap, selectedWeek);

      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  public getAvailableWeeks(csvText: string): string[] {
    const rows = this.parseRows(csvText);

    if (rows.length < 2) {
      return [];
    }

    const columnMap = this.getColumnMap(rows[0]);
    const weeks = new Set<string>();

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const week = this.readValue(row, columnMap.weekIndex);

      if (week) {
        weeks.add(week);
      }
    }

    return Array.from(weeks).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }

  private mapRowToGame(row: string[], map: ColumnMap, selectedWeek?: string): NFLGame | null {
    const week = this.readValue(row, map.weekIndex);
    const date = this.readValue(row, map.dateIndex);
    const team1 = normalizeTeamName(this.readValue(row, map.team1Index));
    const team2 = normalizeTeamName(this.readValue(row, map.team2Index));
    const team1Score = this.parseNumber(this.readValue(row, map.team1ScoreIndex));
    const team2Score = this.parseNumber(this.readValue(row, map.team2ScoreIndex));

    if (selectedWeek && this.normalizeWeekLabel(week) !== this.normalizeWeekLabel(selectedWeek)) {
      return null;
    }

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
    const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());

    const weekIndex = this.findHeaderIndex(normalizedHeaders, ['week', 'week number', 'wk', 'week #']);
    const dateIndex = this.findHeaderIndex(normalizedHeaders, ['date', 'game date', 'matchup date']);
    const team1Index = this.findHeaderIndex(normalizedHeaders, ['winner/tie', 'winner', 'team 1', 'team1', 'home team', 'home', 'team 1 name', 'team 1 team']);
    const team2Index = this.findHeaderIndex(normalizedHeaders, ['loser/tie', 'loser', 'team 2', 'team2', 'away team', 'away', 'team 2 name', 'team 2 team']);
    const team1ScoreIndex = this.findHeaderIndex(normalizedHeaders, ['team 1 score', 'team1 score', 'score 1', 'score1', 'home score', 'pts']);
    const team2ScoreIndex = this.findHeaderIndex(normalizedHeaders, ['team 2 score', 'team2 score', 'score 2', 'score2', 'away score', 'pts']);
    const totalLineIndex = this.findHeaderIndex(normalizedHeaders, ['total line', 'totalline', 'closing total', 'closing_total', 'ou line', 'over/under', 'total']);

    const duplicatePtsIndexes = normalizedHeaders
      .map((header, index) => (header === 'pts' || header.includes('pts') ? index : -1))
      .filter((index) => index >= 0);

    const resolvedTeam1ScoreIndex = team1ScoreIndex >= 0 && team2ScoreIndex >= 0 && team1ScoreIndex === team2ScoreIndex && duplicatePtsIndexes.length >= 2
      ? duplicatePtsIndexes[0]
      : team1ScoreIndex;
    const resolvedTeam2ScoreIndex = team1ScoreIndex >= 0 && team2ScoreIndex >= 0 && team1ScoreIndex === team2ScoreIndex && duplicatePtsIndexes.length >= 2
      ? duplicatePtsIndexes[1]
      : team2ScoreIndex;

    return {
      weekIndex: weekIndex >= 0 ? weekIndex : REQUIRED_COLUMN_INDEXES.week,
      dateIndex: dateIndex >= 0 ? dateIndex : REQUIRED_COLUMN_INDEXES.date,
      team1Index: team1Index >= 0 ? team1Index : REQUIRED_COLUMN_INDEXES.team1,
      team2Index: team2Index >= 0 ? team2Index : REQUIRED_COLUMN_INDEXES.team2,
      team1ScoreIndex: resolvedTeam1ScoreIndex >= 0 ? resolvedTeam1ScoreIndex : REQUIRED_COLUMN_INDEXES.team1Score,
      team2ScoreIndex: resolvedTeam2ScoreIndex >= 0 ? resolvedTeam2ScoreIndex : REQUIRED_COLUMN_INDEXES.team2Score,
      totalLineIndex: totalLineIndex >= 0 ? totalLineIndex : null,
    };
  }

  private findHeaderIndex(headers: string[], aliases: string[]): number {
    for (const alias of aliases) {
      const matchingIndex = headers.findIndex((header) => {
        const normalizedHeader = header.trim().toLowerCase();
        return normalizedHeader === alias || normalizedHeader.includes(alias);
      });

      if (matchingIndex >= 0) {
        return matchingIndex;
      }
    }

    return -1;
  }

  private normalizeWeekLabel(value: string): string {
    return value.trim().toLowerCase().replace(/^week\s*/i, '').replace(/\s+/g, ' ').trim();
  }

  private readValue(row: string[], index: number): string {
    if (index < 0) {
      return '';
    }

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
