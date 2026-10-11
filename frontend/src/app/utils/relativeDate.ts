const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export function relativeDate(isoDate: string, locale: string, now: Date = new Date()): string {
  const elapsed = new Date(isoDate).getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});

  for (const [unit, size] of UNITS) {
    if (Math.abs(elapsed) >= size) {
      return formatter.format(Math.round(elapsed / size), unit);
    }
  }
  return formatter.format(0, 'minute');
}
