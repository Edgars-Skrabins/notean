import {TranslateService} from '@ngx-translate/core';
import {LanguageService} from './language.service';

describe('LanguageService', () => {
  let translateService: jasmine.SpyObj<TranslateService>;
  let service: LanguageService;

  function browserLanguage(language: string) {
    spyOnProperty(navigator, 'language', 'get').and.returnValue(language);
  }

  beforeEach(() => {
    localStorage.clear();
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['use', 'setFallbackLang', 'getCurrentLang']);
    service = new LanguageService(translateService);
  });

  afterEach(() => localStorage.clear());

  it('uses a stored language from the new list', () => {
    localStorage.setItem('language', 'fi');
    browserLanguage('de-DE');

    service.initLanguage();

    expect(translateService.use).toHaveBeenCalledWith('fi');
  });

  it('uses the browser language when it is one of the new languages', () => {
    browserLanguage('ru-RU');

    service.initLanguage();

    expect(translateService.use).toHaveBeenCalledWith('ru');
  });

  it('falls back to English for an unsupported language', () => {
    localStorage.setItem('language', 'pt');
    browserLanguage('ja-JP');

    service.initLanguage();

    expect(translateService.use).toHaveBeenCalledWith('en');
  });

  it('sets English as the fallback language', () => {
    service.initLanguage();

    expect(translateService.setFallbackLang).toHaveBeenCalledWith('en');
  });

  it('returns the current language, or English before one is set', () => {
    translateService.getCurrentLang.and.returnValue(null);
    expect(service.getCurrentLanguage()).toBe('en');

    translateService.getCurrentLang.and.returnValue('lv');
    expect(service.getCurrentLanguage()).toBe('lv');
  });

  it('stores and switches to a new language', () => {
    service.setLanguage('et');

    expect(localStorage.getItem('language')).toBe('et');
    expect(translateService.use).toHaveBeenCalledWith('et');
  });

  it('ignores an unsupported language', () => {
    service.setLanguage('pt');

    expect(localStorage.getItem('language')).toBeNull();
    expect(translateService.use).not.toHaveBeenCalled();
  });
});
