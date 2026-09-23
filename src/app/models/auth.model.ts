export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  username: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
}

export interface AuthResponseSuccess {
  user: AuthUser;
  token: string;
}

export interface AuthResponseError {
  statusMessage: string;
}
