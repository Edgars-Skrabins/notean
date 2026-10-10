export const USERS_ERROR_CODES = [
  'SETTINGS_UPDATE_FAILED',
  'AVATAR_COLOR_INVALID',
  'AVATAR_IMAGE_INVALID',
] as const;

export type UsersErrorCode = typeof USERS_ERROR_CODES[number];
