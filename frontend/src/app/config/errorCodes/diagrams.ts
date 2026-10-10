export const DIAGRAMS_ERROR_CODES = [
  'DIAGRAM_NOT_FOUND',
  'DIAGRAM_CREATE_FAILED',
  'DIAGRAM_UPDATE_FAILED',
] as const;

export type DiagramsErrorCode = typeof DIAGRAMS_ERROR_CODES[number];
