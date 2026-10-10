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

export interface AuthResponseError {
  statusMessage: string;
}
