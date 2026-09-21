import {RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {TranslateService} from "@ngx-translate/core";
import {getBrowserLanguage} from "@utils/browserInformation";
import {defaultLanguage, supportedTranslations} from "@config/translationConfig";

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
    this.translationService.setDefaultLang('en');
    const browserLanguage = getBrowserLanguage();
    const isBrowserLanguageSupported = supportedTranslations.includes(browserLanguage);
    this.translationService.use(isBrowserLanguageSupported ? browserLanguage : defaultLanguage);
  }
}
