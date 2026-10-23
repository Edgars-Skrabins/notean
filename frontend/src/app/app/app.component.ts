import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {filter} from "rxjs";
import {LanguageService} from "@services/language.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {setFeatureDisabledHandler, setUnauthorizedHandler} from "@config/axiosConfig";
import {AppRoutes} from "./app-routes.enum";
import {ToastContainerComponent} from "@components/toast-container/toast-container.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastContainerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  isDashboardRoute = false;

  constructor(
    private languageService: LanguageService,
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService,
  ) {
    this.languageService.initLanguage();

    setUnauthorizedHandler(() => {
      this.authService.logout();
      this.sessionService.clear();
      this.router.navigate([AppRoutes.LOGIN]);
    });

    setFeatureDisabledHandler(() => {
      this.sessionService.load();
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDashboardRoute = this.router.url.startsWith(`/${AppRoutes.DASHBOARD}`);
      });
  }
}
