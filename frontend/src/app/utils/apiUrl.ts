import {axiosInstance} from "@config/axiosConfig";

export function apiUrl(path: string): string {
  return `${axiosInstance.defaults.baseURL}${path}`;
}
