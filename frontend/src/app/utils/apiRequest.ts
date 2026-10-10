import {AxiosResponse} from "axios";
import {toErrorResult} from "@utils/httpError";

export function apiRequest<T extends { success: boolean }>(
  request: Promise<AxiosResponse>,
  onSuccess: (data: AxiosResponse['data']) => Extract<T, { success: true }>,
): Promise<T> {
  return request
    .then((response) => onSuccess(response.data) as T)
    .catch((error) => toErrorResult<T>(error));
}
