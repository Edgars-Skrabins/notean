export function teamPath(teamCode: string, ...segments: (string | number)[]): string {
  return ['/teams', teamCode, ...segments].join('/');
}
