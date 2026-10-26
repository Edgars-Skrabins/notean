export const COMMON_ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'TITLE_TOO_LONG',
  'CONTENT_TOO_LARGE',
  'DESCRIPTION_TOO_LONG',
  'NETWORK_ERROR',
  'UNKNOWN_ERROR',
] as const;

export type CommonErrorCode = typeof COMMON_ERROR_CODES[number];
