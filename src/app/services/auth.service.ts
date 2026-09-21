import {Injectable} from '@angular/core';
import {axiosInstance, setAuthToken} from "@config/axiosConfig";
import {AuthCredentials, AuthResponseError, AuthResponseSuccess} from "@models/auth.model";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl = '/auth';
  private token: string | null = null;

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async login(credentials: AuthCredentials): Promise<string | null> {
    return axiosInstance.post(`${this.authUrl}/login`, credentials)
      .then((response) => {
        this.setToken((response.data as AuthResponseSuccess).token);
        return null;
      })
      .catch((error) => {
        return (error.response?.data as AuthResponseError | undefined)?.statusMessage ?? 'Login failed';
      });
  }

  async register(credentials: AuthCredentials): Promise<string | null> {
    return axiosInstance.post(`${this.authUrl}/register`, credentials)
      .then((response) => {
        this.setToken((response.data as AuthResponseSuccess).token);
        return null;
      })
      .catch((error) => {
        return (error.response?.data as AuthResponseError | undefined)?.statusMessage ?? 'Registration failed';
      });
  }

  logout() {
    this.setToken(null);
  }

  private setToken(token: string | null) {
    this.token = token;
    setAuthToken(token);
  }
}
