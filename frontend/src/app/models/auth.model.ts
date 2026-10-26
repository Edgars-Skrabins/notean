import {Result} from "@models/result.model";
import {AuthErrorCode} from "@config/errorCodes";

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

export type ChangePasswordResponse = Result<object, AuthErrorCode>;
