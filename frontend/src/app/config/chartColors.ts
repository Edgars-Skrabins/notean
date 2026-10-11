export const CHART_COLORS = [
  '#9C6BFF',
  '#4FC3F7',
  '#81C784',
  '#FFB74D',
  '#F06292',
  '#4DB6AC',
  '#FFD54F',
  '#A1887F',
];

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
