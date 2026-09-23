import {Injectable} from '@angular/core';
import {axiosInstance, setAuthToken} from "@config/axiosConfig";
import {AuthCredentials, AuthResponseError, AuthResponseSuccess, AuthUser, RegisterCredentials} from "@models/auth.model";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private loginUrl = '/auth/login';
  private registerUrl = '/auth/register';
  private token: string | null = null;
  private user: AuthUser | null = null;

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  async login(credentials: AuthCredentials): Promise<string | null> {
    return axiosInstance.post(this.loginUrl, {user: credentials})
      .then((response) => {
        this.setSession(response.data as AuthResponseSuccess);
        return null;
      })
      .catch((error) => {
        return (error.response?.data as AuthResponseError | undefined)?.statusMessage ?? 'Login failed';
      });
  }

  async register(credentials: RegisterCredentials): Promise<string | null> {
    return axiosInstance.post(this.registerUrl, {user: credentials})
      .then((response) => {
        this.setSession(response.data as AuthResponseSuccess);
        return null;
      })
      .catch((error) => {
        return (error.response?.data as AuthResponseError | undefined)?.statusMessage ?? 'Registration failed';
      });
  }

  logout() {
    this.token = null;
    this.user = null;
    setAuthToken(null);
  }

  private setSession(response: AuthResponseSuccess) {
    this.token = response.token;
    this.user = response.user;
    setAuthToken(response.token);
  }
}
