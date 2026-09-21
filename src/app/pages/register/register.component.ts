import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  email = '';
  password = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private authService: AuthService) {
  }

  handleRegister() {
    this.authService.register({email: this.email, password: this.password})
      .then((errorMessage) => {
        if (errorMessage) {
          this.alertMessage = errorMessage;
          return;
        }
        this.navigationService.navigate(AppRoutes.DASHBOARD);
      });
  }

  handleGoToLogin() {
    this.navigationService.navigate(AppRoutes.LOGIN);
  }
}
