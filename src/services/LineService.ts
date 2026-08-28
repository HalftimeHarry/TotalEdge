import { normalizeTeamName } from '../models/TeamRegistry';

export interface ParsedLine {
  date: string;
  teamName: string;
  spread: number | null;
  total: number | null;
  moneyLine: number | null;
  isFavorite: boolean;
  raw: string;
}

export class LineService {
  public importFromText(rawText: string): ParsedLine[] {
    const normalized = rawText
      .replace(/\r/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
      .replace(/Date#TeamSpreadTotalM\s*/gi, ' ')
      .replace(/\bLine\s*NFL\b/gi, ' ')
      .replace(/NFL\s*-\s*WEEK\s*#\s*\d+\s*(?:REGULAR\s*SEASON|PRESEASON)\s*-\s*GAME\s*LINE\(S\)/gi, ' ')
      .replace(/NFL\s*-\s*(?:PRESEASON|REGULAR\s*SEASON)\s*-\s*/gi, ' ')
      .replace(/\(\s*(?:PRESEASON|REGULAR\s*SEASON)\s*\)/gi, ' ')
      .replace(/(?:Aug|Sep|Oct|Nov|Dec|Jan|Feb)\s*\d{1,2}(?:\d{3})?\s*(?=(?:[A-Z]{2,4}\s+[A-Z0-9]))/gi, ' ')
      .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/gi, ' ')
      .replace(/\bProps\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return [];
    }

    const rows: ParsedLine[] = [];
    const matchupPattern = /([A-Z]{2,4}\s+[A-Z0-9][A-Z0-9'-. ]+?)\s*(PK|[+-]?\d+(?:\.5|½)?)\s*(?:[+-]?\d{2,3})\s*([ou])\s*(\d+(?:\.5|½)?)\s*(?:[+-]?\d{2,3})\s*([+-]\d{2,3})(?:\d{1,2}:\d{2}\s*(?:AM|PM))?(?:\d{3})?/gi;
    const matches = [...normalized.matchAll(matchupPattern)];

    for (const match of matches) {
      const date = this.findNearestDate(normalized, match.index ?? 0) ?? 'Unknown';
      const teamDisplay = match[1].trim();
      const spread = this.parseSpread(match[2]);
      const total = this.parseNumber(match[4]);
      const moneyLine = this.parseNumber(match[5]);

      if (!date || /SEASON|WEEK|GAME|LINE|NFL|REGULAR|DATE|SEP|OCT|NOV|DEC|JAN|FEB/i.test(teamDisplay)) {
        continue;
      }

      const teamName = this.resolveTeamName(teamDisplay, match[1]);

      if (!teamName) {
        continue;
      }

      rows.push({
        date,
        teamName,
        spread,
        total,
        moneyLine,
        isFavorite: spread === null ? false : spread < 0,
        raw: match[0],
      });
    }

    return rows;
  }

  private findNearestDate(value: string, index: number): string | null {
    const dateMatches = [...value.slice(0, index).matchAll(/(?:^|\s)(Aug|Sep|Oct|Nov|Dec|Jan|Feb)\s*(\d{1,2})(?:\d{3})?(?=\D|$)/gi)];
    const latest = dateMatches[dateMatches.length - 1];

    if (!latest) {
      return null;
    }

    const month = latest[1];
    const day = String(Number.parseInt(latest[2], 10)).padStart(2, '0');
    return this.cleanDate(`${month} ${day}`);
  }

  private cleanDate(value: string): string {
    const match = value.trim().match(/^(Aug|Sep|Oct|Nov|Dec|Jan|Feb)\s*(\d{1,2})$/i);

    if (!match) {
      return value.trim().replace(/\s+/g, ' ');
    }

    const month = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const day = String(Number.parseInt(match[2], 10)).padStart(2, '0');
    return `${month} ${day}`;
  }

  private resolveTeamName(display: string, rawValue: string): string {
    const cleanedDisplay = display.trim().replace(/\s*\([^)]*\)\s*$/g, '').trim();
    const parts = cleanedDisplay.split(/\s+/);
    const abbreviation = parts[0]?.toUpperCase() ?? '';
    const suffix = parts.slice(1).join(' ');

    if (abbreviation) {
      const direct = normalizeTeamName(`${abbreviation} ${suffix}`.trim());
      if (direct) {
        return direct;
      }

      const fallback = normalizeTeamName(abbreviation);
      if (fallback) {
        return fallback;
      }
    }

    const fallbackName = rawValue
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .replace(new RegExp(`^${abbreviation}`, 'i'), '')
      .replace(/\s+/g, ' ')
      .trim();

    return fallbackName ? this.titleCase(fallbackName) : '';
  }

  private titleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private parseSpread(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const cleaned = value.trim();
    if (cleaned.toUpperCase() === 'PK') {
      return 0;
    }

    const normalized = cleaned.replace('½', '.5');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().replace('½', '.5');
    const cleaned = normalized.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
