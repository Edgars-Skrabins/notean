export const PRIORITIES_ERROR_CODES = [
  'PRIORITY_NOT_FOUND',
  'PRIORITY_NAME_TAKEN',
  'PRIORITY_SAVE_FAILED',
] as const;

export type PrioritiesErrorCode = typeof PRIORITIES_ERROR_CODES[number];
