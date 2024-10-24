import englishTranslationsJSON from './english.json'
import latvianTranslationsJSON from './latvian.json'
import germanTranslationsJSON from './german.json'
import {Injectable} from '@angular/core';

export enum Language {
  ENGLISH = 'ENGLISH',
  LATVIAN = 'LATVIAN',
  GERMAN = 'GERMAN',
}

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  currentLanguage: Language = Language.ENGLISH

  languageDictionaries: any = {
    ENGLISH: englishTranslationsJSON,
    LATVIAN: latvianTranslationsJSON,
    GERMAN: germanTranslationsJSON
  }

  getTranslation(text: string) {
    const translation: string = this.languageDictionaries[this.currentLanguage][text];
    if (!translation) {
      console.error('Translation:', text, 'does not exist!');
      return "ERROR";
    }
    return translation;
  }

  setLanguage(language: Language) {
    this.currentLanguage = language;
  }

}
