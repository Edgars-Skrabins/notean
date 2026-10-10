import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {AppRoutes} from "../../app/app-routes.enum";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

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

  constructor(private navigationService: NavigationService, private authService: AuthService) {
  }

  handleRegister() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    this.authService.register({email: this.email, password: this.password})
      .then((errorMessage) => {
        if (errorMessage) {
          this.alertMessage = errorMessage;
          return;
        }
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
