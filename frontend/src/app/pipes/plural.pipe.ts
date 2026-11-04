import {Pipe, PipeTransform} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {defaultLanguage} from '@config/translationConfig';
import {pluralKey} from '@utils/plural';

@Pipe({name: 'plural', pure: false})
export class PluralPipe implements PipeTransform {
  constructor(private translateService: TranslateService) {
  }

  transform(key: string, count: number): string {
    const language = this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage;
    return pluralKey(key, count, language);
  }
}
