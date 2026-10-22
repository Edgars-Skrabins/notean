export const SEARCH_ERROR_CODES = [
  'QUERY_TOO_SHORT',
  'INVALID_TYPE',
] as const;

export type SearchErrorCode = typeof SEARCH_ERROR_CODES[number];
