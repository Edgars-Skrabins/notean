import {relativeDate} from "./relativeDate";

describe('relativeDate', () => {
  const now = new Date('2026-10-11T12:00:00Z');

  it('uses days for older dates', () => {
    expect(relativeDate('2026-10-09T12:00:00Z', 'en', now)).toBe('2 days ago');
  });

  it('uses hours within a day', () => {
    expect(relativeDate('2026-10-11T09:00:00Z', 'en', now)).toBe('3 hours ago');
  });

  it('says now for very recent dates', () => {
    expect(relativeDate('2026-10-11T11:59:50Z', 'en', now)).toBe('this minute');
  });
});
