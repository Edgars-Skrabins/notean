import {Result} from "@models/result.model";
import {AuthErrorCode, UsersErrorCode} from "@config/errorCodes";

export interface AuthCredentials {
  email: string;
  password: string;
}

export type RegisterCredentials = AuthCredentials;

export interface AuthUser {
  id: number;
  email: string;
}

export interface AuthResponseSuccess {
  user: AuthUser;
  token: string;
}

export type AuthResponse = Result<object, AuthErrorCode>;

export interface OwnedTeam {
  code: string;
  name: string;
}

export type DeleteAccountErrorCode = Extract<UsersErrorCode, 'OWNS_TEAMS'>;

export type OwnsTeamsFailure = { success: false; code: DeleteAccountErrorCode; teams: OwnedTeam[] };

export type DeleteAccountResponse = Result<object> | OwnsTeamsFailure;

export type ChangePasswordResponse = Result<object, AuthErrorCode>;
