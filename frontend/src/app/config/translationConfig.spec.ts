import {supportedTranslations} from './translationConfig';

type Translations = Record<string, unknown>;

async function loadTranslations(code: string): Promise<Translations> {
  const response = await fetch(`/assets/translations/${code}.json`);
  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pluralKeys(english: Translations): string[] {
  return Object.keys(english).filter((key) => {
    const value = english[key];
    return isRecord(value) && 'other' in value;
  });
}

describe('translation files', () => {
  let english: Translations;

  beforeAll(async () => {
    english = await loadTranslations('en');
  });

  it('loads en.json', () => {
    expect(Object.keys(english).length).toBeGreaterThan(0);
  });

  supportedTranslations.forEach((code) => {
    it(`gives every plural key in ${code} a form for each of its plural categories`, async () => {
      const translations = await loadTranslations(code);
      const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;

      pluralKeys(english).forEach((key) => {
        const forms = translations[key];
        expect(isRecord(forms)).withContext(`${code} ${key}`).toBeTrue();
        if (!isRecord(forms)) {
          return;
        }
        categories.forEach((category) => {
          const form = forms[category];
          expect(typeof form).withContext(`${code} ${key}.${category}`).toBe('string');
          expect(String(form)).withContext(`${code} ${key}.${category}`).toContain('{{count}}');
        });
      });
    });
  });
});
