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
      {value: 'en', label: 'English', prefix: '🇬🇧'},
      {value: 'da', label: 'Dansk', prefix: '🇩🇰'},
      {value: 'de', label: 'Deutsch', prefix: '🇩🇪'},
      {value: 'et', label: 'Eesti', prefix: '🇪🇪'},
      {value: 'es', label: 'Español', prefix: '🇪🇸'},
      {value: 'fr', label: 'Français', prefix: '🇫🇷'},
      {value: 'lv', label: 'Latviešu', prefix: '🇱🇻'},
      {value: 'lt', label: 'Lietuvių', prefix: '🇱🇹'},
      {value: 'fi', label: 'Suomi', prefix: '🇫🇮'},
      {value: 'sv', label: 'Svenska', prefix: '🇸🇪'},
      {value: 'ru', label: 'Русский', prefix: '🇷🇺'},
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
