export const TEAMS_ERROR_CODES = [
  'TEAM_NOT_FOUND',
  'NOT_TEAM_MEMBER',
  'WRONG_TEAM_PASSWORD',
  'TEAM_CREATE_FAILED',
  'TEAM_RENAME_FAILED',
  'NICKNAME_TAKEN',
  'NICKNAME_INVALID',
  'FEATURE_DISABLED',
] as const;

export type TeamsErrorCode = typeof TEAMS_ERROR_CODES[number];

export type TeamAccessErrorCode = Extract<TeamsErrorCode, 'TEAM_NOT_FOUND' | 'NOT_TEAM_MEMBER'>;
