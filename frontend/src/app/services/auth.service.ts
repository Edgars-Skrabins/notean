import {Injectable} from '@angular/core';
import {axiosInstance, setAuthToken} from "@config/axiosConfig";
import {AuthCredentials, AuthResponse, AuthResponseSuccess, AuthUser, RegisterCredentials} from "@models/auth.model";
import {apiRequest} from "@utils/apiRequest";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loginUrl = '/auth/login';
  private registerUrl = '/auth/register';
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

  logout() {
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
