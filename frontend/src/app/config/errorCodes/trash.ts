export const TRASH_ERROR_CODES = [
  'TRASH_ENTRY_NOT_FOUND',
  'TRASH_BOARD_IN_TRASH',
] as const;

export type TrashErrorCode = typeof TRASH_ERROR_CODES[number];
