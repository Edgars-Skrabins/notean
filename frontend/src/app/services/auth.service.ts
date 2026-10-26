import {Injectable} from '@angular/core';
import {axiosInstance, setAuthToken} from "@config/axiosConfig";
import {AxiosError} from "axios";
import {
  AuthCredentials,
  AuthResponse,
  AuthResponseSuccess,
  AuthUser,
  ChangePasswordResponse,
  DeleteAccountResponse,
  OwnedTeam,
  RegisterCredentials,
} from "@models/auth.model";
import {apiRequest} from "@utils/apiRequest";
import {toErrorCode, toErrorResult} from "@utils/httpError";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loginUrl = '/auth/login';
  private registerUrl = '/auth/register';
  private sessionUrl = '/auth/session';
  private meUrl = '/users/me';
  private passwordUrl = '/users/me/password';
  private tokenStorageKey = 'authToken';
  private userStorageKey = 'authUser';

  private token: string | null = localStorage.getItem(this.tokenStorageKey);
  private user: AuthUser | null = this.readStoredUser();

  constructor() {
    if (this.token) {
      setAuthToken(this.token);
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(
      axiosInstance.post(this.loginUrl, {user: credentials}),
      (data) => {
        this.setSession(data as AuthResponseSuccess);
        return {success: true};
      },
    );
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(
      axiosInstance.post(this.registerUrl, {user: credentials}),
      (data) => {
        this.setSession(data as AuthResponseSuccess);
        return {success: true};
      },
    );
  }

  async deleteAccount(): Promise<DeleteAccountResponse> {
    return axiosInstance.delete(this.meUrl)
      .then((): DeleteAccountResponse => ({success: true}))
      .catch((error): DeleteAccountResponse => toErrorCode(error) === 'OWNS_TEAMS'
        ? {success: false, code: 'OWNS_TEAMS', teams: mapOwnedTeams((error as AxiosError<RawOwnsTeamsError>).response!.data)}
        : toErrorResult<DeleteAccountResponse>(error));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    return apiRequest<ChangePasswordResponse>(
      axiosInstance.patch(this.passwordUrl, {password: {current_password: currentPassword, new_password: newPassword}}),
      () => ({success: true}),
    );
  }

  logout() {
    if (this.token) {
      axiosInstance.delete(this.sessionUrl, {headers: {Authorization: `Bearer ${this.token}`}}).catch(() => undefined);
    }
    this.token = null;
    this.user = null;
    setAuthToken(null);
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
  }

  private setSession(response: AuthResponseSuccess) {
    this.token = response.token;
    this.user = response.user;
    setAuthToken(response.token);
    localStorage.setItem(this.tokenStorageKey, response.token);
    localStorage.setItem(this.userStorageKey, JSON.stringify(response.user));
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}

interface RawOwnsTeamsError {
  teams: { code: string; name: string }[];
}

export function mapOwnedTeams(data: RawOwnsTeamsError): OwnedTeam[] {
  return data.teams.map((team) => ({code: team.code, name: team.name}));
}
