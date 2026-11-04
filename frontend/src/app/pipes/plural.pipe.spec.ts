import {TestBed} from '@angular/core/testing';
import {provideTranslateService, TranslateService} from '@ngx-translate/core';
import {PluralPipe} from './plural.pipe';

describe('PluralPipe', () => {
  let translateService: TranslateService;
  let pipe: PluralPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideTranslateService()]});
    translateService = TestBed.inject(TranslateService);
    pipe = new PluralPipe(translateService);
  });

  it('follows the current language', () => {
    translateService.use('lv');
    expect(pipe.transform('KEY', 10)).toBe('KEY.zero');

    translateService.use('en');
    expect(pipe.transform('KEY', 10)).toBe('KEY.other');
  });

  it('falls back to the fallback language, then the default language', () => {
    spyOn(translateService, 'getCurrentLang').and.returnValue(null as unknown as string);
    const fallback = spyOn(translateService, 'getFallbackLang').and.returnValue('ru');
    expect(pipe.transform('KEY', 3)).toBe('KEY.few');

    fallback.and.returnValue(null);
    expect(pipe.transform('KEY', 3)).toBe('KEY.other');
  });
});
