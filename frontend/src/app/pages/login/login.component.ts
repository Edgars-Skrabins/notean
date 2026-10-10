import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {AppRoutes} from "../../app/app-routes.enum";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {SettingsService} from "@services/settings.service";
import {AvatarService} from "@services/avatar.service";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
import {errorPhrase} from "@utils/errorPhrase";

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
  isSubmitting = false;

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private teamService: TeamService,
    private settingsService: SettingsService,
    private avatarService: AvatarService
  ) {
  }

  handleLogin() {
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    this.authService.login({email: this.email, password: this.password})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.settingsService.load();
        this.avatarService.load();

        return this.teamService.fetchMyTeam().then((team) => {
          if (team) {
            this.navigationService.navigate(AppRoutes.DASHBOARD);
          } else {
            this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
          }
        });
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  handleGoToRegister() {
    this.navigationService.navigate(AppRoutes.REGISTER);
  }
}
