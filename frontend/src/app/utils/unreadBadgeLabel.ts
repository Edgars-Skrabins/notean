const MAX_SHOWN_COUNT = 99;

export function unreadBadgeLabel(count: number): string {
  return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : `${count}`;
}
