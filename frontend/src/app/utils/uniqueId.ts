let counter = 0;

export function uniqueId(prefix: string): string {
  counter++;
  return `${prefix}-${counter}`;
}
