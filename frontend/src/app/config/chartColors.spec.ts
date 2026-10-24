import {chartColor} from "./chartColors";

describe('chartColor', () => {
  it('returns the theme chart token for an index', () => {
    expect(chartColor(0)).toBe('var(--color-chart-1)');
    expect(chartColor(7)).toBe('var(--color-chart-8)');
  });

  it('wraps around after eight colours', () => {
    expect(chartColor(8)).toBe('var(--color-chart-1)');
    expect(chartColor(10)).toBe('var(--color-chart-3)');
  });
});
