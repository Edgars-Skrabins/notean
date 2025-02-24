import {RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {TranslateService} from "@ngx-translate/core";
import {defaultLanguage, Language, supportedTranslations} from "@config/translationConfig";
import {getBrowserLanguage} from "@utils/browserInformation";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,

  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  constructor(private translationService: TranslateService) {
    this.setDefaultLanguageSettings();
  }

  private setDefaultLanguageSettings() {
    this.translationService.setDefaultLang(defaultLanguage);
    const browserLanguage = getBrowserLanguage();
    const isBrowserLanguageSupported = supportedTranslations.includes(browserLanguage as Language);
    this.translationService.use(isBrowserLanguageSupported ? browserLanguage : defaultLanguage);
  }
}
