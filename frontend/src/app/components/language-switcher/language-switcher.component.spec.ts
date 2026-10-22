import {LanguageSwitcherComponent} from './language-switcher.component';
import {LanguageService} from '@services/language.service';

describe('LanguageSwitcherComponent', () => {
  let languageService: jasmine.SpyObj<LanguageService>;
  let component: LanguageSwitcherComponent;

  beforeEach(() => {
    languageService = jasmine.createSpyObj<LanguageService>('LanguageService', ['getCurrentLanguage', 'setLanguage']);
    languageService.getCurrentLanguage.and.returnValue('de');
    component = new LanguageSwitcherComponent(languageService);
  });

  it('lists every language in order with its flag and native name', () => {
    expect(component.options).toEqual([
      {value: 'en', label: '🇬🇧 English'},
      {value: 'da', label: '🇩🇰 Dansk'},
      {value: 'de', label: '🇩🇪 Deutsch'},
      {value: 'et', label: '🇪🇪 Eesti'},
      {value: 'es', label: '🇪🇸 Español'},
      {value: 'fr', label: '🇫🇷 Français'},
      {value: 'lv', label: '🇱🇻 Latviešu'},
      {value: 'lt', label: '🇱🇹 Lietuvių'},
      {value: 'fi', label: '🇫🇮 Suomi'},
      {value: 'sv', label: '🇸🇪 Svenska'},
      {value: 'ru', label: '🇷🇺 Русский'},
    ]);
  });

  it('shows the current language', () => {
    expect(component.currentLanguage).toBe('de');
  });

  it('switches the language when one is picked', () => {
    component.handleSelectLanguage('ru');

    expect(languageService.setLanguage).toHaveBeenCalledWith('ru');
  });
});
