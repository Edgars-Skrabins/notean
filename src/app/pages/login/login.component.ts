import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NavigationService} from "@services/navigation.service";
import {ApiService} from "@services/api.service";
import {AppRoutes} from "../../app/app.routes";

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

  constructor(private navigationService: NavigationService, private apiService: ApiService) {
  }

  handleLogin() {
    if (!this.doesFormHaveValidData()) {
      this.alertMessage = 'Invalid data';
      return;
    }

    this.alertMessage = 'Logging in...';
  }

  doesFormHaveValidData() {
    return this.email !== '' && this.password !== '';
  }

  handleGoToRegister() {
    this.navigationService.navigate(AppRoutes.REGISTER);
  }
}
