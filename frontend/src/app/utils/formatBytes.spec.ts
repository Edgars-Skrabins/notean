import {formatBytes} from "./formatBytes";

describe('formatBytes', () => {
  it('keeps bytes whole and switches units at 1024', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('shows one decimal below 10 and none from 10 up', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(12.4 * 1024 * 1024)).toBe('12 MB');
    expect(formatBytes(500 * 1024 * 1024)).toBe('500 MB');
  });
});
