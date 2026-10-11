export const TICKETS_ERROR_CODES = [
  'TICKET_NOT_FOUND',
  'TICKET_CREATE_FAILED',
  'TICKET_UPDATE_FAILED',
] as const;

export type TicketsErrorCode = typeof TICKETS_ERROR_CODES[number];
