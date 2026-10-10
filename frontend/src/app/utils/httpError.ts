import axios from "axios";
import {ERROR_CODES_BY_DOMAIN, ErrorCode} from "@config/errorCodes";

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set(Object.values(ERROR_CODES_BY_DOMAIN).flat());

function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && KNOWN_ERROR_CODES.has(code);
}

export function toErrorCode(error: unknown): ErrorCode {
  if (!axios.isAxiosError(error)) {
    return 'UNKNOWN_ERROR';
  }
  if (!error.response) {
    return 'NETWORK_ERROR';
  }

  const code = (error.response.data as { code?: unknown } | undefined)?.code;
  return isErrorCode(code) ? code : 'UNKNOWN_ERROR';
}

export function toErrorResult<T extends { success: boolean }>(error: unknown): Extract<T, { success: false }> {
  return {success: false, code: toErrorCode(error)} as unknown as Extract<T, { success: false }>;
}
