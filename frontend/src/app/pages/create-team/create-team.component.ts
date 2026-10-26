import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH} from "@config/contentLimits";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {isNicknameErrorCode, nicknameErrorPhrase, validateNickname} from "@utils/nicknameValidation";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
import {TeamCodeDisplayComponent} from "@components/team-code-display/team-code-display.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-create-team',
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent,
    TeamCodeDisplayComponent
  ],
  templateUrl: './create-team.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './create-team.component.css'
})
export class CreateTeamComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

  teamName = '';
  teamPassword = '';
  nickname = '';
  alertMessage = '';
  createdTeamCode: string | null = null;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private toastService: ToastService
  ) {
  }

  handleCreateTeam() {
    if (!this.doesFormHaveValidData()) {
      this.alertMessage = PHRASES.INVALID_FORM_DATA;
      return;
    }

    const nicknameError = validateNickname(this.nickname);
    if (nicknameError) {
      this.showError(nicknameErrorPhrase(nicknameError));
      return;
    }

    this.teamService.createTeam({name: this.teamName, password: this.teamPassword, nickname: this.nickname.trim()})
      .then((response) => {
        if (!response.success) {
          if (isNicknameErrorCode(response.code)) {
            this.showError(errorPhrase(response.code));
            return;
          }
          this.alertMessage = errorPhrase(response.code);
          return;
        }
        this.createdTeamCode = response.team.code;
      });
  }

  doesFormHaveValidData() {
    return this.teamName !== '' && this.teamPassword !== '';
  }

  showError(message: string) {
    this.toastService.show({type: ToastType.ERROR, message});
  }

  handleContinueToDashboard() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }

  handleGoToJoinTeam() {
    this.navigationService.navigate(AppRoutes.JOIN_TEAM);
  }
}
