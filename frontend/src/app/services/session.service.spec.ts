import {AxiosError} from "axios";
import {mapSession, SessionService} from "./session.service";
import {axiosInstance} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";
import {SettingsService} from "@services/settings.service";
import {AvatarService} from "@services/avatar.service";
import {TeamService} from "@services/team.service";
import {testTeam, rawTestTeam} from "../testing/teamFixtures";

const rawSession = {
  user: {id: 1, email: 'alice@example.com'},
  settings: {show_favorites_on_home: false, show_favorites_in_sidebar: true, show_my_work_on_home: true},
  avatar: {color: 'blue' as const, image_url: null},
  team: {team: rawTestTeam(testTeam({id: 2, name: 'Engineering', code: 'abc'})), role: 'owner' as const, nickname: 'Alice'},
};

describe('mapSession', () => {
  it('maps settings, avatar and team and keeps user', () => {
    expect(mapSession(rawSession)).toEqual({
      user: {id: 1, email: 'alice@example.com'},
      settings: {showFavoritesOnHome: false, showFavoritesInSidebar: true, showMyWorkOnHome: true},
      avatar: {color: 'blue', imageUrl: null},
      team: {team: testTeam({id: 2, name: 'Engineering', code: 'abc'}), role: 'owner', nickname: 'Alice'},
    });
  });
});

describe('SessionService', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let settingsService: jasmine.SpyObj<SettingsService>;
  let avatarService: jasmine.SpyObj<AvatarService>;
  let teamService: jasmine.SpyObj<TeamService>;

  function create() {
    return new SessionService(authService, settingsService, avatarService, teamService);
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    authService.isAuthenticated.and.returnValue(false);
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['set', 'clear']);
    avatarService = jasmine.createSpyObj<AvatarService>('AvatarService', ['set', 'clear']);
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['applyActiveTeam', 'clearCurrentTeam']);
  });

  it('loads on construction only when authenticated', () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(new Promise(() => undefined));

    create();
    expect(get).not.toHaveBeenCalled();

    authService.isAuthenticated.and.returnValue(true);
    create();
    expect(get).toHaveBeenCalledOnceWith('/users/me');
  });

  it('load hands each part to its service', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: rawSession}));

    const response = await create().load();

    expect(response.success).toBeTrue();
    expect(settingsService.set).toHaveBeenCalledWith({showFavoritesOnHome: false, showFavoritesInSidebar: true, showMyWorkOnHome: true});
    expect(avatarService.set).toHaveBeenCalledWith({color: 'blue', imageUrl: null});
    expect(teamService.applyActiveTeam).toHaveBeenCalledWith({team: testTeam(testTeam({id: 2, name: 'Engineering', code: 'abc'})), role: 'owner', nickname: 'Alice'});
  });

  it('passes a null team on so the stored team is cleared', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {...rawSession, team: null}}));

    await create().load();

    expect(teamService.applyActiveTeam).toHaveBeenCalledWith(null);
  });

  it('changes nothing when the request fails', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.reject(new AxiosError('Network Error')));

    const response = await create().load();

    expect(response).toEqual({success: false, code: 'NETWORK_ERROR'});
    expect(settingsService.set).not.toHaveBeenCalled();
    expect(teamService.applyActiveTeam).not.toHaveBeenCalled();
  });

  it('clear resets settings, avatar and team', () => {
    create().clear();

    expect(settingsService.clear).toHaveBeenCalled();
    expect(avatarService.clear).toHaveBeenCalled();
    expect(teamService.clearCurrentTeam).toHaveBeenCalled();
  });
});
