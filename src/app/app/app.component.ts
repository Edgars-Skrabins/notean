import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {TranslateService} from "@ngx-translate/core";
import {filter} from "rxjs";
import {getBrowserLanguage} from "@utils/browserInformation";
import {defaultLanguage, supportedTranslations} from "@config/translationConfig";
import {AppRoutes} from "./app-routes.enum";

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
  isDashboardRoute = false;

  constructor(private translationService: TranslateService, private router: Router) {
    this.setDefaultLanguageSettings();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDashboardRoute = this.router.url.startsWith(`/${AppRoutes.DASHBOARD}`);
      });
  }

  private setDefaultLanguageSettings() {
    this.translationService.setDefaultLang('en');
    const browserLanguage = getBrowserLanguage();
    const isBrowserLanguageSupported = supportedTranslations.includes(browserLanguage);
    this.translationService.use(isBrowserLanguageSupported ? browserLanguage : defaultLanguage);
  }
}
