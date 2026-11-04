const pluralRules = new Map<string, Intl.PluralRules>();

export function pluralCategory(count: number, language: string): Intl.LDMLPluralRule {
  let rules = pluralRules.get(language);
  if (!rules) {
    rules = new Intl.PluralRules(language);
    pluralRules.set(language, rules);
  }
  return rules.select(count);
}

export function pluralKey(key: string, count: number, language: string): string {
  return `${key}.${pluralCategory(count, language)}`;
}
