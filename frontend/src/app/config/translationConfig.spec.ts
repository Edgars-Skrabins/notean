import {supportedTranslations} from './translationConfig';

type Translations = Record<string, unknown>;

const REMOVED_KEYS = ['CONFIRM_DELETE_PRIORITY_ONE', 'CONFIRM_DELETE_TAG_ONE', 'TRASH_DAYS_LEFT_ONE', 'TRASH_ITEMS_INSIDE_ONE'];

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

  it('finds the plural keys in en.json', () => {
    expect(pluralKeys(english)).toContain('MEMBER_COUNT');
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

      REMOVED_KEYS.forEach((key) => {
        expect(key in translations).withContext(`${code} ${key}`).toBeFalse();
      });
    });
  });
});
