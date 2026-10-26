import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {AppRoutes} from "../../app/app-routes.enum";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.css'
})
export class LoginComponent {
  protected readonly PHRASES = PHRASES;

  email = '';
  password = '';
  alertMessage = '';
  isSubmitting = false;

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private sessionService: SessionService
  ) {
  }

  handleLogin() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    this.authService.login({email: this.email, password: this.password})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        return this.sessionService.load().then((session) => {
          if (session.success && session.session.team) {
            this.navigationService.navigate(AppRoutes.DASHBOARD);
          } else {
            this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
          }
        });
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  handleGoToRegister() {
    this.navigationService.navigate(AppRoutes.REGISTER);
  }
}
