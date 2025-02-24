import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {ApiService, UserIdentifyingParams} from "@services/api.service";
import {TranslateModule} from "@ngx-translate/core";
import {TranslationPhrase} from "@config/translationConfig";

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
  TranslationPhrase = TranslationPhrase;
  email = '';
  password = '';
  confirmPassword = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private apiService: ApiService) {
  }

  handleRegister() {
    const registerData: UserIdentifyingParams = {
      email: this.email,
      password: this.password,
    }

    if (!this.doesFormHaveValidData()) {
        this.alertMessage = 'Invalid data';
        return;
    }

    this.apiService.registerUser(registerData)
      .then((successMessage: string) => {
        this.alertMessage = successMessage;
      })
      .catch((errorMessage: string) => {
        this.alertMessage = errorMessage
      })
  }

  doesFormHaveValidData() {
    return this.email !== '' && this.password !== '';
  }

  handleGoToLogin() {
    this.navigationService?.navigate(AppRoutes.LOGIN);
  }
}
