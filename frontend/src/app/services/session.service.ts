import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {AuthService} from "@services/auth.service";
import {mapSettings, RawSettings, SettingsService} from "@services/settings.service";
import {AvatarService, mapAvatar, RawAvatar} from "@services/avatar.service";
import {mapActiveTeam, RawActiveTeam, TeamService} from "@services/team.service";
import {ThemeService} from "@services/theme.service";
import {CableService} from "@services/cable.service";
import {AuthUser} from "@models/auth.model";
import {SessionData, SessionResponse} from "@models/session.model";

interface RawSession {
  user: AuthUser;
  settings: RawSettings;
  avatar: RawAvatar;
  team: RawActiveTeam | null;
}

export function mapSession(raw: RawSession): SessionData {
  return {
    user: raw.user,
    settings: mapSettings(raw.settings),
    avatar: mapAvatar(raw.avatar),
    team: raw.team ? mapActiveTeam(raw.team) : null,
  };
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private sessionUrl = '/users/me';

  constructor(
    authService: AuthService,
    private settingsService: SettingsService,
    private avatarService: AvatarService,
    private teamService: TeamService,
    private themeService: ThemeService,
    private cableService: CableService
  ) {
    if (authService.isAuthenticated()) {
      this.load();
    }
  }

  async load(): Promise<SessionResponse> {
    return apiRequest<SessionResponse>(
      axiosInstance.get(this.sessionUrl),
      (data) => {
        const session = mapSession(data);
        this.settingsService.set(session.settings);
        this.themeService.apply(session.settings.theme, session.settings.themeMode);
        this.avatarService.set(session.avatar);
        this.teamService.applyActiveTeam(session.team);
        return {success: true, session};
      },
    );
  }

  clear() {
    this.settingsService.clear();
    this.avatarService.clear();
    this.teamService.clearCurrentTeam();
    this.cableService.disconnect();
  }
}
