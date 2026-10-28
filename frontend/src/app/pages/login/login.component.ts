import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {AppRoutes} from "../../app/app-routes.enum";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
import {errorPhrase} from "@utils/errorPhrase";
import {isSafeReturnUrl, RETURN_URL_PARAM} from "@utils/returnUrl";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    NgIf,
    TranslatePipe,
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
    private sessionService: SessionService,
    private route: ActivatedRoute
  ) {
  }

  private get returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM);
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
          const returnUrl = this.returnUrl;
          if (isSafeReturnUrl(returnUrl)) {
            this.navigationService.navigateByUrl(returnUrl);
          } else if (session.success && session.session.team) {
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
    const returnUrl = this.returnUrl;
    if (isSafeReturnUrl(returnUrl)) {
      this.navigationService.navigateWithQuery({[RETURN_URL_PARAM]: returnUrl}, AppRoutes.REGISTER);
    } else {
      this.navigationService.navigate(AppRoutes.REGISTER);
    }
  }
}
