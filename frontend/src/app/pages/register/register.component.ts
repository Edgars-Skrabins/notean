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
import {isPasswordLongEnough} from "@utils/passwordValidation";
import {isSafeReturnUrl, RETURN_URL_PARAM} from "@utils/returnUrl";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    NgIf,
    TranslatePipe,
    AuthCardComponent
  ],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './register.component.css'
})
export class RegisterComponent {
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

  handleRegister() {
    if (this.isSubmitting) {
      return;
    }
    if (!isPasswordLongEnough(this.password)) {
      this.alertMessage = PHRASES.PASSWORD_TOO_SHORT;
      return;
    }
    this.isSubmitting = true;

    this.authService.register({email: this.email, password: this.password})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }
        this.sessionService.load();
        this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  handleGoToLogin() {
    const returnUrl = this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM);
    if (isSafeReturnUrl(returnUrl)) {
      this.navigationService.navigateWithQuery({[RETURN_URL_PARAM]: returnUrl}, AppRoutes.LOGIN);
    } else {
      this.navigationService.navigate(AppRoutes.LOGIN);
    }
  }
}
