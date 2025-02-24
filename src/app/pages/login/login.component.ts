import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NavigationService} from "@services/navigation.service";
import {ApiService} from "@services/api.service";
import {AppRoutes} from "../../app/app.routes";
import {TranslationPhrase} from "@config/translationConfig";
import {TranslateModule} from "@ngx-translate/core";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'] // '@styles/forms.css',
})
export class LoginComponent {
  email = '';
  password = '';
  alertMessage = '';
  protected readonly TranslationPhrase = TranslationPhrase;

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
