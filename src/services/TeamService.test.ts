import { describe, expect, it } from 'vitest';
import { TeamService } from './TeamService';

describe('TeamService', () => {
  it('imports an entire division or conference table in one shot', () => {
    const csv = [
      'Tm,W,L,T,W-L%,PF,PA,PD,MoV,SoS,SRS,OSRS,DSRS',
      'New England Patriots*,14,3,0,.824,490,320,170,10.0,-4.5,5.5,3.7,1.8',
      'Buffalo Bills+,12,5,0,.706,481,365,116,6.8,-2.3,4.5,4.9,-0.4',
      'Miami Dolphins,7,10,0,.412,347,424,-77,-4.5,-1.8,-6.3,-3.8,-2.5',
    ].join('\n');

    const teams = new TeamService().importFromText(csv);

    expect(teams).toHaveLength(3);
    expect(teams[0].name).toBe('New England Patriots');
    expect(teams[0].isPlayoffTeam).toBe(true);
    expect(teams[0].playoffMarker).toBe('*');
    expect(teams[1].name).toBe('Buffalo Bills');
    expect(teams[1].playoffMarker).toBe('+');
    expect(teams[2].name).toBe('Miami Dolphins');
    expect(teams[2].pointsFor).toBe(347);
  });
});
