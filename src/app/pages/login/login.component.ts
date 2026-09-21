import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
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
        this.navigationService.navigate(AppRoutes.DASHBOARD);
      });
  }

  handleGoToRegister() {
    this.navigationService.navigate(AppRoutes.REGISTER);
  }
}
