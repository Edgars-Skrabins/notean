export const NOTIFICATIONS_ERROR_CODES = [
  'NOTIFICATION_NOT_FOUND',
] as const;

export type NotificationsErrorCode = typeof NOTIFICATIONS_ERROR_CODES[number];
