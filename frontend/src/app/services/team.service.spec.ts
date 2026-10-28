import {AxiosError, AxiosHeaders} from "axios";
import {mapTeam, mapTeamMember, TeamService} from "./team.service";
import {TeamFeatures, TeamMember} from "@models/team.model";
import {axiosInstance} from "@config/axiosConfig";
import {testTeam, rawTestTeam} from "../testing/teamFixtures";

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
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');

    const service = new TeamService();

    expect(service.getCurrentTeam()).toEqual(testTeam({id: 1, name: 'Team A', code: 'aaa'}));
    expect(service.getCurrentRole()).toBe('owner');
    expect(service.getCurrentNickname()).toBe('Alice');
  });

  it('clearCurrentTeam removes both the team and the role from storage', () => {
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
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
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
    const get = spyOn(axiosInstance, 'get');

    new TeamService();

    expect(get).not.toHaveBeenCalled();
  });

  it('applyActiveTeam stores the team, role and nickname from the server', () => {
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
    localStorage.setItem('currentTeamRole', 'user');
    localStorage.setItem('currentNickname', 'Old');
    const service = new TeamService();

    service.applyActiveTeam({team: testTeam({id: 2, name: 'Team B', code: 'bbb'}), role: 'admin', nickname: 'Ally'});

    expect(service.getCurrentTeam()).toEqual(testTeam({id: 2, name: 'Team B', code: 'bbb'}));
    expect(service.getCurrentRole()).toBe('admin');
    expect(service.getCurrentNickname()).toBe('Ally');
    expect(localStorage.getItem('currentTeamRole')).toBe('admin');
  });

  it('applyActiveTeam clears the stored team when the server has none', () => {
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
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
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({id: 1, name: 'Team A', code: 'aaa'})));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');
    service = new TeamService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores the nickname from an activate response', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({
      data: {team: rawTestTeam(testTeam({id: 2, name: 'Team B', code: 'bbb'})), role: 'user', nickname: 'Ally'}
    }));

    const response = await service.activateTeam('bbb');

    expect(response).toEqual({success: true, team: testTeam({id: 2, name: 'Team B', code: 'bbb'}), role: 'user', nickname: 'Ally'});
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

describe('mapTeam', () => {
  it('maps the feature flags to camelCase', () => {
    const result = mapTeam(rawTestTeam({pages_enabled: false, boards_enabled: false}));

    expect(result).toEqual(testTeam({pagesEnabled: false, boardsEnabled: false}));
  });
});

describe('TeamService features', () => {
  let service: TeamService;
  let emitted: TeamFeatures[];

  beforeEach(() => {
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({diagramsEnabled: false})));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');
    service = new TeamService();
    emitted = [];
    service.features$.subscribe((features) => emitted.push(features));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('derives the features from the stored team', () => {
    expect(emitted).toEqual([{pages: true, diagrams: false, boards: true, chat: true}]);
    expect(service.isFeatureEnabled('diagrams')).toBeFalse();
    expect(service.isFeatureEnabled('boards')).toBeTrue();
  });

  it('treats a stored team without flags as having every feature on', () => {
    localStorage.setItem('currentTeam', JSON.stringify({id: 1, name: 'Team A', code: 'aaa'}));

    const legacy = new TeamService();

    expect(legacy.isFeatureEnabled('pages')).toBeTrue();
    expect(legacy.isFeatureEnabled('diagrams')).toBeTrue();
    expect(legacy.isFeatureEnabled('boards')).toBeTrue();
  });

  it('updateFeatures patches only the given flags and re-emits the stored team', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({
      data: {team: rawTestTeam({diagrams_enabled: false, boards_enabled: false})}
    }));

    const response = await service.updateFeatures('aaa', {boards: false});

    expect(patch).toHaveBeenCalledWith('/teams/aaa/features', {team: {boards_enabled: false}});
    expect(response).toEqual({success: true, team: testTeam({diagramsEnabled: false, boardsEnabled: false})});
    expect(service.isFeatureEnabled('boards')).toBeFalse();
    expect(JSON.parse(localStorage.getItem('currentTeam')!).boardsEnabled).toBeFalse();
    expect(emitted).toEqual([{pages: true, diagrams: false, boards: true, chat: true}, {pages: true, diagrams: false, boards: false, chat: true}]);
  });

  it('updateFeatures returns the server code and keeps the features', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed', undefined, undefined, undefined, {
      status: 403, statusText: '', data: {code: 'FORBIDDEN'}, headers: {}, config: {headers: new AxiosHeaders()}
    })));

    const response = await service.updateFeatures('aaa', {pages: false});

    expect(response).toEqual({success: false, code: 'FORBIDDEN'});
    expect(service.isFeatureEnabled('pages')).toBeTrue();
    expect(emitted.length).toBe(1);
  });

  it('applyFeatures updates the current team only and emits only on a change', () => {
    service.applyFeatures(testTeam({code: 'other', pagesEnabled: false}));
    expect(service.isFeatureEnabled('pages')).toBeTrue();

    service.applyFeatures(testTeam({diagramsEnabled: false, name: 'Renamed'}));
    expect(emitted.length).toBe(1);

    service.applyFeatures(testTeam({pagesEnabled: false, diagramsEnabled: false}));
    expect(emitted[emitted.length - 1]).toEqual({pages: false, diagrams: false, boards: true, chat: true});
    expect(emitted.length).toBe(2);
  });

  it('clearing the team turns every feature back on', () => {
    service.clearCurrentTeam();

    expect(emitted[emitted.length - 1]).toEqual({pages: true, diagrams: true, boards: true, chat: true});
  });
});

describe('TeamService member management', () => {
  let service: TeamService;
  const rawMember = {id: 2, nickname: 'Bob', role: 'admin', avatar: {color: 'lime', image_url: null}};
  const member: TeamMember = {id: 2, nickname: 'Bob', role: 'admin', avatar: {color: 'lime', imageUrl: null}};

  function axiosError(status: number, code: string) {
    return new AxiosError('failed', undefined, undefined, undefined, {
      status, statusText: '', data: {code}, headers: {}, config: {headers: new AxiosHeaders()}
    });
  }

  beforeEach(() => {
    localStorage.setItem('currentTeam', JSON.stringify(testTeam({code: 'aaa'})));
    localStorage.setItem('currentTeamRole', 'owner');
    localStorage.setItem('currentNickname', 'Alice');
    service = new TeamService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('removeMember deletes the member and maps the returned members', async () => {
    const del = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {members: [rawMember]}}));

    const response = await service.removeMember('aaa', 3);

    expect(del).toHaveBeenCalledWith('/teams/aaa/members/3');
    expect(response).toEqual({success: true, members: [member]});
  });

  it('removeMember returns the server code on failure', async () => {
    spyOn(axiosInstance, 'delete').and.returnValue(Promise.reject(axiosError(403, 'CANNOT_MANAGE_ADMIN')));

    expect(await service.removeMember('aaa', 3)).toEqual({success: false, code: 'CANNOT_MANAGE_ADMIN'});
  });

  it('updateMemberRole patches the role and maps the returned members', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {members: [rawMember]}}));

    const response = await service.updateMemberRole('aaa', 2, 'admin');

    expect(patch).toHaveBeenCalledWith('/teams/aaa/members/2/role', {membership: {role: 'admin'}});
    expect(response).toEqual({success: true, members: [member]});
    expect(service.getCurrentRole()).toBe('owner');
  });

  it('updateMemberRole returns the server code on failure', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(axiosError(422, 'ROLE_INVALID')));

    expect(await service.updateMemberRole('aaa', 2, 'admin')).toEqual({success: false, code: 'ROLE_INVALID'});
  });

  it('transferOwnership stores the new admin role for the active team', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {members: [rawMember], role: 'admin'}}));

    const response = await service.transferOwnership('aaa', 2);

    expect(post).toHaveBeenCalledWith('/teams/aaa/transfer_ownership', {membership: {user_id: 2}});
    expect(response).toEqual({success: true, members: [member], role: 'admin'});
    expect(service.getCurrentRole()).toBe('admin');
    expect(localStorage.getItem('currentTeamRole')).toBe('admin');
  });

  it('transferOwnership keeps the stored role when it fails', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(axiosError(422, 'CANNOT_TRANSFER_TO_SELF')));

    const response = await service.transferOwnership('aaa', 1);

    expect(response).toEqual({success: false, code: 'CANNOT_TRANSFER_TO_SELF'});
    expect(service.getCurrentRole()).toBe('owner');
  });

  it('leaveTeam clears the active team when leaving it', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: ''}));

    const response = await service.leaveTeam('aaa');

    expect(post).toHaveBeenCalledWith('/teams/aaa/leave');
    expect(response).toEqual({success: true});
    expect(service.getCurrentTeam()).toBeNull();
  });

  it('leaveTeam keeps the active team when leaving another team', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: ''}));

    await service.leaveTeam('bbb');

    expect(service.getCurrentTeam()).toEqual(testTeam({code: 'aaa'}));
  });

  it('leaveTeam returns the server code and keeps the team on failure', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(axiosError(422, 'OWNER_CANNOT_LEAVE')));

    const response = await service.leaveTeam('aaa');

    expect(response).toEqual({success: false, code: 'OWNER_CANNOT_LEAVE'});
    expect(service.getCurrentTeam()).toEqual(testTeam({code: 'aaa'}));
  });
});
