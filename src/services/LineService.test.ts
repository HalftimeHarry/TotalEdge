import { describe, expect, it } from 'vitest';
import { LineService } from './LineService';

describe('LineService', () => {
  it('parses sportsbook line blocks from the site format into date and team entries', () => {
    const raw = `
      NFL - Sep 09 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)
      Sep 09451![]NE PATRIOTS+3½-110o44-110+1655:23 PM452![]SEA SEAHAWKS-3½-110u44-110-195
      NFL - Sep 13 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)
      Sep 13455![]CLE BROWNS+7½-110o40½-110+28010:03 AM456![]JAC JAGUARS-7½-110u40½-110-365
    `;

    const lines = new LineService().importFromText(raw);

    expect(lines).toHaveLength(4);
    expect(lines[0].date).toBe('Sep 09');
    expect(lines[0].teamName).toBe('New England Patriots');
    expect(lines[0].spread).toBe(3.5);
    expect(lines[0].isFavorite).toBe(false);
    expect(lines[0].total).toBe(44);
    expect(lines[0].moneyLine).toBe(165);

    expect(lines[1].date).toBe('Sep 09');
    expect(lines[1].teamName).toBe('Seattle Seahawks');
    expect(lines[1].spread).toBe(-3.5);
    expect(lines[1].isFavorite).toBe(true);
    expect(lines[1].moneyLine).toBe(-195);

    expect(lines[2].date).toBe('Sep 13');
    expect(lines[2].teamName).toBe('Cleveland Browns');
    expect(lines[2].total).toBe(40.5);
    expect(lines[3].date).toBe('Sep 13');
    expect(lines[3].teamName).toBe('Jacksonville Jaguars');
    expect(lines[3].spread).toBe(-7.5);
  });

  it('extracts team names and totals from the real betting line format including city names and totals', () => {
    const raw = `
      NFL - Sep 09 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)
      Sep 09451![]NE PATRIOTS+3½-110o44-110+1655:23 PM452![]SEA SEAHAWKS-3½-110u44-110-195
      NFL - Sep 13 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)
      Sep 13455![]CLE BROWNS+7½-110o40½-110+28010:03 AM456![]JAC JAGUARS-7½-110u40½-110-365
      Sep 13479![]DAL COWBOYS-3+100o48½-110-1655:23 PM480![]NY GIANTS+3-120u48½-110+145
      Sep 14481![]DEN BRONCOS+3-125o43-110+1305:18 PM482![]KC CHIEFS-3+105u43-110-150
    `;

    const lines = new LineService().importFromText(raw);

    expect(lines).toHaveLength(8);
    expect(lines[0].teamName).toBe('New England Patriots');
    expect(lines[0].total).toBe(44);
    expect(lines[1].teamName).toBe('Seattle Seahawks');
    expect(lines[1].total).toBe(44);
    expect(lines[2].teamName).toBe('Cleveland Browns');
    expect(lines[2].total).toBe(40.5);
    expect(lines[3].teamName).toBe('Jacksonville Jaguars');
    expect(lines[3].total).toBe(40.5);
    expect(lines[4].teamName).toBe('Dallas Cowboys');
    expect(lines[4].total).toBe(48.5);
    expect(lines[5].teamName).toBe('New York Giants');
    expect(lines[5].total).toBe(48.5);
    expect(lines[6].teamName).toBe('Denver Broncos');
    expect(lines[6].total).toBe(43);
    expect(lines[7].teamName).toBe('Kansas City Chiefs');
    expect(lines[7].total).toBe(43);
  });

  it('parses the raw sportsbook text pasted by the user including the Date#TeamSpreadTotalM line prefix', () => {
    const raw = `Date#TeamSpreadTotalM LineNFL - Sep 09 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)Sep 09451![](https://www.abcweb.ag/DGS/App_Themes/Classic/images/icons/nfl/NE%20PATRIOTS.gif)NE PATRIOTS+3½-110o44-110+1655:23 PM452![](https://www.abcweb.ag/DGS/App_Themes/Classic/images/icons/nfl/SEA%20SEAHAWKS.gif)SEA SEAHAWKS-3½-110u44-110-195[Props]NFL - Sep 10 NFL - WEEK # 1 REGULAR SEASON - GAME LINE(S)Sep 10453![](https://www.abcweb.ag/DGS/App_Themes/Classic/images/icons/imagefound.gif)SFO 49ERS+3½-110o48-110+1655:38 PM454![](https://www.abcweb.ag/DGS/App_Themes/Classic/images/icons/nfl/LA%20RAMS.gif)LA RAMS-3½-110u48-110-200[Props]`;

    const lines = new LineService().importFromText(raw);

    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0].teamName).toBe('New England Patriots');
    expect(lines[0].total).toBe(44);
    expect(lines[1].teamName).toBe('Seattle Seahawks');
    expect(lines[1].total).toBe(44);
    expect(lines[2].teamName).toBe('San Francisco 49ers');
    expect(lines[2].total).toBe(48);
    expect(lines[3].teamName).toBe('Los Angeles Rams');
    expect(lines[3].total).toBe(48);
  });

  it('parses preseason line blocks that use August dates and parenthetical team labels', () => {
    const raw = `Date#TeamSpreadTotalM LineNFL - PRESEASON - Aug 27 NFL - PRESEASON WEEK #3 GAME LINE(S)NFL - PRESEASON WEEK #3Aug 27107![]LA RAMS (PRESEASON)+3-110o38-110+1507:03 PM108![]LA CHARGERS (PRESEASON)-3-110u38-110-170NFL - PRESEASON - Aug 28 NFL - PRESEASON WEEK #3 GAME LINE(S)Aug 28109![]WAS COMMANDERS (PRESEASON)+3-110o33½-110+1403:03 PM110![]BAL RAVENS (PRESEASON)-3-110u33½-110-160`;

    const lines = new LineService().importFromText(raw);

    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0].date).toBe('Aug 27');
    expect(lines[0].teamName).toBe('Los Angeles Rams');
    expect(lines[0].spread).toBe(3);
    expect(lines[0].total).toBe(38);
    expect(lines[1].teamName).toBe('Los Angeles Chargers');
    expect(lines[1].spread).toBe(-3);
    expect(lines[2].date).toBe('Aug 28');
    expect(lines[2].teamName).toBe('Washington Commanders');
    expect(lines[3].teamName).toBe('Baltimore Ravens');
  });
});
