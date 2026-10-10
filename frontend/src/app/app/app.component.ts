import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Component} from "@angular/core";
import {filter} from "rxjs";
import {LanguageService} from "@services/language.service";
import {AuthService} from "@services/auth.service";
import {SettingsService} from "@services/settings.service";
import {AvatarService} from "@services/avatar.service";
import {setUnauthorizedHandler} from "@config/axiosConfig";
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
    private settingsService: SettingsService,
    private avatarService: AvatarService,
  ) {
    this.languageService.initLanguage();

    setUnauthorizedHandler(() => {
      this.authService.logout();
      this.settingsService.clear();
      this.avatarService.clear();
      this.router.navigate([AppRoutes.LOGIN]);
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDashboardRoute = this.router.url.startsWith(`/${AppRoutes.DASHBOARD}`);
      });
  }
}
