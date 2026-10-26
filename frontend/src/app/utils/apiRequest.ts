import {AxiosError, AxiosResponse} from "axios";
import {toErrorCode, toErrorResult} from "@utils/httpError";
import {EditConflict} from "@models/result.model";

export function apiRequest<T extends { success: boolean }>(
  request: Promise<AxiosResponse>,
  onSuccess: (data: AxiosResponse['data']) => Extract<T, { success: true }>,
): Promise<T> {
  return request
    .then((response) => onSuccess(response.data) as T)
    .catch((error) => toErrorResult<T>(error));
}

export function versionedRequest<T extends { success: boolean }, L>(
  request: Promise<AxiosResponse>,
  onSuccess: (data: AxiosResponse['data']) => Extract<T, { success: true }>,
  onConflict: (data: AxiosResponse['data']) => L,
): Promise<T | EditConflict<L>> {
  return request
    .then((response) => onSuccess(response.data) as T | EditConflict<L>)
    .catch((error) => toErrorCode(error) === 'EDIT_CONFLICT'
      ? {success: false, code: 'EDIT_CONFLICT', latest: onConflict((error as AxiosError).response!.data)} as EditConflict<L>
      : toErrorResult<T>(error));
}
