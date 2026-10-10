export const COMMON_ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'NETWORK_ERROR',
  'UNKNOWN_ERROR',
] as const;

export type CommonErrorCode = typeof COMMON_ERROR_CODES[number];
