import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";
import {PHRASES} from "@config/phrases";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {isNicknameErrorCode, nicknameErrorPhrase, validateNickname} from "@utils/nicknameValidation";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-join-team',
  imports: [
    FormsModule,
    NgIf,
    TranslatePipe,
    AuthCardComponent
  ],
  templateUrl: './join-team.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './join-team.component.css'
})
export class JoinTeamComponent {
  protected readonly PHRASES = PHRASES;

  teamCode = '';
  teamPassword = '';
  nickname = '';
  alertMessage = '';
  isSubmitting = false;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private toastService: ToastService
  ) {
  }

  handleJoinTeam() {
    if (this.isSubmitting) {
      return;
    }

    if (!this.doesFormHaveValidData()) {
      this.alertMessage = PHRASES.INVALID_FORM_DATA;
      return;
    }

    const nicknameError = validateNickname(this.nickname);
    if (nicknameError) {
      this.showError(nicknameErrorPhrase(nicknameError));
      return;
    }

    this.isSubmitting = true;

    this.teamService.joinTeam({code: this.teamCode, password: this.teamPassword, nickname: this.nickname.trim()})
      .then((response) => {
        if (!response.success) {
          if (isNicknameErrorCode(response.code)) {
            this.showError(errorPhrase(response.code));
            return;
          }
          this.alertMessage = errorPhrase(response.code);
          return;
        }
        this.navigationService.navigate(AppRoutes.DASHBOARD);
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  doesFormHaveValidData() {
    return this.teamCode.length === 32 && this.teamPassword !== '';
  }

  showError(message: string) {
    this.toastService.show({type: ToastType.ERROR, message});
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }
}
