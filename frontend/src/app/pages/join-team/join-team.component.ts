import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";
import {PHRASES} from "@config/phrases";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {NicknameError} from "@models/team.model";
import {nicknameErrorPhrase, validateNickname} from "@utils/nicknameValidation";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-join-team',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './join-team.component.html',
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
      this.alertMessage = 'Invalid data';
      return;
    }

    const nicknameError = validateNickname(this.nickname);
    if (nicknameError) {
      this.showNicknameError(nicknameError);
      return;
    }

    this.isSubmitting = true;

    this.teamService.joinTeam({code: this.teamCode, password: this.teamPassword, nickname: this.nickname.trim()})
      .then((response) => {
        if (!response.success) {
          if (response.nicknameError) {
            this.showNicknameError(response.nicknameError);
            return;
          }
          this.alertMessage = response.statusMessage;
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

  showNicknameError(error: NicknameError) {
    this.toastService.show({type: ToastType.ERROR, message: nicknameErrorPhrase(error)});
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }
}
