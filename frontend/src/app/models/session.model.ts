import {Result} from "@models/result.model";
import {AuthUser} from "@models/auth.model";
import {UserSettings} from "@models/settings.model";
import {Avatar} from "@models/avatar.model";
import {Team, TeamRole} from "@models/team.model";

export interface ActiveTeam {
  team: Team;
  role: TeamRole;
  nickname: string;
}

export interface SessionData {
  user: AuthUser;
  settings: UserSettings;
  avatar: Avatar;
  team: ActiveTeam | null;
}

export type SessionResponse = Result<{ session: SessionData }>;
