import {TeamService} from "./team.service";

describe('TeamService role persistence', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('returns a null role when nothing is stored', () => {
    const service = new TeamService();

    expect(service.getCurrentRole()).toBeNull();
  });

  it('reads a previously stored role back on construction', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'owner');

    const service = new TeamService();

    expect(service.getCurrentTeam()).toEqual({id: 1, name: 'Team A', code: 'aaa'});
    expect(service.getCurrentRole()).toBe('owner');
  });

  it('clearCurrentTeam removes both the team and the role from storage', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'admin');
    const service = new TeamService();

    service.clearCurrentTeam();

    expect(service.getCurrentTeam()).toBeNull();
    expect(service.getCurrentRole()).toBeNull();
    expect(localStorage.getItem('currentTeam')).toBeNull();
    expect(localStorage.getItem('currentTeamRole')).toBeNull();
  });

  it('backfills the role via fetchMyTeam when a team is stored without a role', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    spyOn(TeamService.prototype, 'fetchMyTeam').and.returnValue(Promise.resolve(null));

    new TeamService();

    expect(TeamService.prototype.fetchMyTeam).toHaveBeenCalled();
  });

  it('does not call fetchMyTeam when there is no stored team', () => {
    spyOn(TeamService.prototype, 'fetchMyTeam').and.returnValue(Promise.resolve(null));

    new TeamService();

    expect(TeamService.prototype.fetchMyTeam).not.toHaveBeenCalled();
  });

  it('does not call fetchMyTeam when both team and role are already stored', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'owner');
    spyOn(TeamService.prototype, 'fetchMyTeam').and.returnValue(Promise.resolve(null));

    new TeamService();

    expect(TeamService.prototype.fetchMyTeam).not.toHaveBeenCalled();
  });
});
