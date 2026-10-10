import {AxiosError, AxiosHeaders} from "axios";
import {mapTeamMember, TeamService} from "./team.service";
import {axiosInstance} from "@config/axiosConfig";

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

  it('does not request anything on construction', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    const get = spyOn(axiosInstance, 'get');

    new TeamService();

    expect(get).not.toHaveBeenCalled();
  });

  it('applyActiveTeam stores the team, role and nickname from the server', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    localStorage.setItem('currentTeamRole', 'user');
    localStorage.setItem('currentNickname', 'Old');
    const service = new TeamService();

    service.applyActiveTeam({team: {id: 2, name: 'Team B', code: 'bbb'}, role: 'admin', nickname: 'Ally'});

    expect(service.getCurrentTeam()).toEqual({id: 2, name: 'Team B', code: 'bbb'});
    expect(service.getCurrentRole()).toBe('admin');
    expect(service.getCurrentNickname()).toBe('Ally');
    expect(localStorage.getItem('currentTeamRole')).toBe('admin');
  });

  it('applyActiveTeam clears the stored team when the server has none', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));
    const service = new TeamService();

    service.applyActiveTeam(null);

    expect(service.getCurrentTeam()).toBeNull();
    expect(localStorage.getItem('currentTeam')).toBeNull();
  });
});

describe('TeamService nickname', () => {
  let service: TeamService;

  function axiosError(status?: number, code?: string) {
    const response = status === undefined
      ? undefined
      : {status, statusText: '', data: {code}, headers: {}, config: {headers: new AxiosHeaders()}};
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

  it('updateNickname returns the server code and keeps the stored nickname', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError(409, 'NICKNAME_TAKEN')));

    const response = await service.updateNickname('Bob');

    expect(response).toEqual({success: false, code: 'NICKNAME_TAKEN'});
    expect(service.getCurrentNickname()).toBe('Alice');
  });

  it('updateNickname returns NETWORK_ERROR when there is no response', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError()));

    expect(await service.updateNickname('Bob')).toEqual({success: false, code: 'NETWORK_ERROR'});
  });

  it('createTeam returns the server code', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(axiosError(409, 'NICKNAME_TAKEN')));

    const response = await service.createTeam({name: 'Team B', password: 'secret', nickname: 'Bob'});

    expect(response).toEqual({success: false, code: 'NICKNAME_TAKEN'});
  });

  it('joinTeam returns WRONG_TEAM_PASSWORD from the server', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(axiosError(401, 'WRONG_TEAM_PASSWORD')));

    const response = await service.joinTeam({code: 'bbb', password: 'secret', nickname: 'Bob'});

    expect(response).toEqual({success: false, code: 'WRONG_TEAM_PASSWORD'});
  });
});
