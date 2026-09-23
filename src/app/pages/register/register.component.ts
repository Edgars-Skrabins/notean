import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  protected readonly PHRASES = PHRASES;

  email = '';
  username = '';
  password = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private authService: AuthService) {
  }

  handleRegister() {
    this.authService.register({email: this.email, username: this.username, password: this.password})
      .then((errorMessage) => {
        if (errorMessage) {
          this.alertMessage = errorMessage;
          return;
        }
        this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
      });
  }

  handleGoToLogin() {
    this.navigationService.navigate(AppRoutes.LOGIN);
  }
}
