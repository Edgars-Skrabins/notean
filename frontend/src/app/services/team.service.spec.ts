import {AxiosError, AxiosHeaders} from "axios";
import {mapTeamMember, TeamService} from "./team.service";
import {axiosInstance} from "@config/axiosConfig";
import {NicknameError} from "@models/team.model";

describe('mapTeamMember', () => {
  it('maps id, nickname, role and avatar', () => {
    const result = mapTeamMember({id: 1, nickname: 'alice', role: 'admin', avatar: {color: 'lime', image_url: null}});

    expect(result).toEqual({id: 1, nickname: 'alice', role: 'admin', avatar: {color: 'lime', imageUrl: null}});
  });
});

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
    localStorage.setItem('currentNickname', 'Alice');

    const service = new TeamService();

    expect(service.getCurrentTeam()).toEqual({id: 1, name: 'Team A', code: 'aaa'});
    expect(service.getCurrentRole()).toBe('owner');
    expect(service.getCurrentNickname()).toBe('Alice');
  });

  it('clearCurrentTeam removes both the team and the role from storage', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'admin');
    localStorage.setItem('currentNickname', 'Alice');
    const service = new TeamService();

    service.clearCurrentTeam();

    expect(service.getCurrentTeam()).toBeNull();
    expect(service.getCurrentRole()).toBeNull();
    expect(localStorage.getItem('currentTeam')).toBeNull();
    expect(localStorage.getItem('currentTeamRole')).toBeNull();
    expect(service.getCurrentNickname()).toBeNull();
    expect(localStorage.getItem('currentNickname')).toBeNull();
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

  it('backfills the nickname via fetchMyTeam when a team is stored without a nickname', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'owner');
    spyOn(TeamService.prototype, 'fetchMyTeam').and.returnValue(Promise.resolve(null));

    new TeamService();

    expect(TeamService.prototype.fetchMyTeam).toHaveBeenCalled();
  });

  it('does not call fetchMyTeam when team, role and nickname are already stored', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');
    spyOn(TeamService.prototype, 'fetchMyTeam').and.returnValue(Promise.resolve(null));

    new TeamService();

    expect(TeamService.prototype.fetchMyTeam).not.toHaveBeenCalled();
  });
});

describe('TeamService nickname', () => {
  let service: TeamService;

  function axiosError(status?: number) {
    const response = status === undefined
      ? undefined
      : {status, statusText: '', data: {}, headers: {}, config: {headers: new AxiosHeaders()}};
    return new AxiosError('failed', undefined, undefined, undefined, response);
  }

  beforeEach(() => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');
    service = new TeamService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores the nickname from an activate response', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({
      data: {team: {id: 2, name: 'Team B', code: 'bbb'}, role: 'user', nickname: 'Ally'}
    }));

    const response = await service.activateTeam('bbb');

    expect(response).toEqual({success: true, team: {id: 2, name: 'Team B', code: 'bbb'}, role: 'user', nickname: 'Ally'});
    expect(service.getCurrentNickname()).toBe('Ally');
    expect(localStorage.getItem('currentNickname')).toBe('Ally');
  });

  it('updateNickname patches the active team and stores the returned nickname', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {nickname: 'Ally'}}));

    const response = await service.updateNickname('Ally');

    expect(patch).toHaveBeenCalledWith('/teams/aaa/nickname', {membership: {nickname: 'Ally'}});
    expect(response).toEqual({success: true, nickname: 'Ally'});
    expect(service.getCurrentNickname()).toBe('Ally');
    expect(localStorage.getItem('currentNickname')).toBe('Ally');
  });

  it('updateNickname maps a 409 to TAKEN and keeps the stored nickname', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError(409)));

    const response = await service.updateNickname('Bob');

    expect(response).toEqual({success: false, error: NicknameError.TAKEN});
    expect(service.getCurrentNickname()).toBe('Alice');
  });

  it('updateNickname maps a missing response to NETWORK', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError()));

    expect(await service.updateNickname('Bob')).toEqual({success: false, error: NicknameError.NETWORK});
  });

  it('updateNickname maps any other failure to UNKNOWN', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError(422)));

    expect(await service.updateNickname('Bob')).toEqual({success: false, error: NicknameError.UNKNOWN});
  });

  it('createTeam reports a TAKEN nickname error on 409 and no nickname error on other failures', async () => {
    spyOn(axiosInstance, 'post').and.returnValues(Promise.reject(axiosError(409)), Promise.reject(axiosError(422)));

    const taken = await service.createTeam({name: 'Team B', password: 'secret', nickname: 'Bob'});
    const other = await service.createTeam({name: 'Team B', password: 'secret', nickname: 'Bob'});

    expect(taken).toEqual(jasmine.objectContaining({success: false, nicknameError: NicknameError.TAKEN}));
    expect(other).toEqual(jasmine.objectContaining({success: false, nicknameError: null}));
  });

  it('joinTeam reports a NETWORK nickname error when there is no response', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(axiosError()));

    const response = await service.joinTeam({code: 'bbb', password: 'secret', nickname: 'Bob'});

    expect(response).toEqual(jasmine.objectContaining({success: false, nicknameError: NicknameError.NETWORK}));
  });
});
