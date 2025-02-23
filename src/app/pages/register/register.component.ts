import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {ApiService} from "@services/api.service";

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
  confirmPassword = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private apiService: ApiService) {
  }

  handleRegister() {
    if (!this.doesFormHaveValidData()) {
      this.alertMessage = 'Invalid data';
      return;
    }

    this.alertMessage = 'Registering...';
  }

  doesFormHaveValidData() {
    return this.email !== '' && this.password !== '';
  }

  handleGoToLogin() {
    this.navigationService?.navigate(AppRoutes.LOGIN);
  }
}
