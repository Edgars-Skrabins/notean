export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponseSuccess {
  token: string;
}

export interface AuthResponseError {
  statusMessage: string;
}
