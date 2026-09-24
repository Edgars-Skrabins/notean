import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {filter} from "rxjs";
import {LanguageService} from "@services/language.service";
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

  constructor(private languageService: LanguageService, private router: Router) {
    this.languageService.initLanguage();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDashboardRoute = this.router.url.startsWith(`/${AppRoutes.DASHBOARD}`);
      });
  }
}
