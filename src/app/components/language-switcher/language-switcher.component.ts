import {Component} from '@angular/core';
import {NgFor, NgClass} from '@angular/common';
import {LanguageService} from '@services/language.service';
import {languageOptions} from '@config/languageOptions';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    NgFor,
    NgClass
  ],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css'
})
export class LanguageSwitcherComponent {
  protected readonly languages = languageOptions;

  constructor(private languageService: LanguageService) {
  }

  get currentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  handleSelectLanguage(code: string) {
    this.languageService.setLanguage(code);
  }
}
