import {unreadBadgeLabel} from "./unreadBadgeLabel";

describe('unreadBadgeLabel', () => {
  it('shows the count up to 99 and 99+ above it', () => {
    expect(unreadBadgeLabel(7)).toBe('7');
    expect(unreadBadgeLabel(99)).toBe('99');
    expect(unreadBadgeLabel(100)).toBe('99+');
  });
});
