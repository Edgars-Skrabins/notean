export const PAGES_ERROR_CODES = [
  'PAGE_NOT_FOUND',
  'PAGE_CREATE_FAILED',
  'PAGE_UPDATE_FAILED',
] as const;

export type PagesErrorCode = typeof PAGES_ERROR_CODES[number];
