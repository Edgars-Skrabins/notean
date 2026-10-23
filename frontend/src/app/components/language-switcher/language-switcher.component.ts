import {Component} from '@angular/core';
import {PHRASES} from '@config/phrases';
import {LanguageService} from '@services/language.service';
import {languageOptions} from '@config/languageOptions';
import {DropdownOption} from '@models/dropdown.model';
import {DropdownComponent} from '@components/dropdown/dropdown.component';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    DropdownComponent
  ],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css'
})
export class LanguageSwitcherComponent {
  protected readonly PHRASES = PHRASES;
  readonly options: DropdownOption[] = languageOptions.map((language) => ({
    value: language.code,
    label: language.label,
    prefix: language.flag,
  }));

  constructor(private languageService: LanguageService) {
  }

  get currentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  handleSelectLanguage(code: string | number | null) {
    this.languageService.setLanguage(code as string);
  }
}
