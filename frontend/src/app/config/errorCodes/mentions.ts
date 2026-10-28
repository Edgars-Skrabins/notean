export const MENTIONS_ERROR_CODES = [
  'TOO_MANY_MENTIONS',
  'INVALID_MENTION',
] as const;

export type MentionsErrorCode = typeof MENTIONS_ERROR_CODES[number];
