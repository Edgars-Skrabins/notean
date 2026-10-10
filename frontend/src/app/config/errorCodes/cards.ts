export const CARDS_ERROR_CODES = [
  'CARD_NOT_FOUND',
  'CARD_CREATE_FAILED',
  'CARD_UPDATE_FAILED',
] as const;

export type CardsErrorCode = typeof CARDS_ERROR_CODES[number];
