import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  protected readonly PHRASES = PHRASES;

  email = '';
  password = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private authService: AuthService) {
  }

  handleLogin() {
    this.authService.login({email: this.email, password: this.password})
      .then((errorMessage) => {
        if (errorMessage) {
          this.alertMessage = errorMessage;
          return;
        }
        this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
      });
  }

  handleGoToRegister() {
    this.navigationService.navigate(AppRoutes.REGISTER);
  }
}
