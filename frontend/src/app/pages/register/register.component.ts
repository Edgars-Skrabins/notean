import {Component} from '@angular/core';
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
import {isPasswordLongEnough} from "@utils/passwordValidation";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './register.component.html',
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
    private sessionService: SessionService
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
    this.navigationService.navigate(AppRoutes.LOGIN);
  }
}
