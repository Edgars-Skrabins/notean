import axios from "axios";

export function toErrorResult<T extends { success: boolean; statusMessage?: string }>(
  error: unknown,
  fallbackMessage: string,
): T {
  const statusMessage = axios.isAxiosError(error)
    ? (error.response?.data as { statusMessage?: string } | undefined)?.statusMessage ?? fallbackMessage
    : fallbackMessage;
  return {success: false, statusMessage} as T;
}
