export const TAGS_ERROR_CODES = [
  'TAG_NOT_FOUND',
  'TAG_NAME_TAKEN',
  'TAG_SAVE_FAILED',
  'TAG_LIMIT_REACHED',
  'TICKET_TAG_LIMIT_REACHED',
] as const;

export type TagsErrorCode = typeof TAGS_ERROR_CODES[number];
