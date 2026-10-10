import {Injectable} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {getBrowserLanguage} from '@utils/browserInformation';
import {defaultLanguage, supportedTranslations} from '@config/translationConfig';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private languageStorageKey = 'language';

  constructor(private translateService: TranslateService) {
  }

  getCurrentLanguage(): string {
    return this.translateService.currentLang || defaultLanguage;
  }

  initLanguage() {
    this.translateService.setDefaultLang(defaultLanguage);

    const storedLanguage = localStorage.getItem(this.languageStorageKey);
    const browserLanguage = getBrowserLanguage();
    const initialLanguage = [storedLanguage, browserLanguage]
      .find((language) => !!language && supportedTranslations.includes(language)) ?? defaultLanguage;

    this.translateService.use(initialLanguage);
  }

  setLanguage(language: string) {
    if (!supportedTranslations.includes(language)) {
      return;
    }

    localStorage.setItem(this.languageStorageKey, language);
    this.translateService.use(language);
  }
}
