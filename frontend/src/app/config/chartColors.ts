export const CHART_COLOR_COUNT = 8;

export function chartColor(index: number): string {
  return `var(--color-chart-${(index % CHART_COLOR_COUNT) + 1})`;
}
