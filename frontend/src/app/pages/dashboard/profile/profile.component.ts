import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {NicknameError} from "@models/team.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {nicknameErrorPhrase, validateNickname} from "@utils/nicknameValidation";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {AppRoutes} from "../../../app/app-routes.enum";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    ConfirmDialogComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements HasUnsavedChanges {
  protected readonly PHRASES = PHRASES;

  savedNickname: string;
  nickname: string;
  isSaving = false;
  isLeaveConfirmOpen = false;

  private resolveLeave: ((canLeave: boolean) => void) | null = null;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private toastService: ToastService
  ) {
    this.savedNickname = this.teamService.getCurrentNickname() ?? '';
    this.nickname = this.savedNickname;
  }

  get hasUnsavedChanges(): boolean {
    return this.nickname !== this.savedNickname;
  }

  handleSave() {
    if (!this.hasUnsavedChanges || this.isSaving) {
      return;
    }

    const nicknameError = validateNickname(this.nickname);
    if (nicknameError) {
      this.showNicknameError(nicknameError);
      return;
    }

    this.isSaving = true;

    this.teamService.updateNickname(this.nickname.trim())
      .then((response) => {
        if (!response.success) {
          this.showNicknameError(response.error);
          return;
        }

        this.savedNickname = response.nickname;
        this.nickname = response.nickname;
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROFILE_UPDATED});
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    this.resolveLeave?.(false);
    this.isLeaveConfirmOpen = true;

    return new Promise((resolve) => {
      this.resolveLeave = resolve;
    });
  }

  handleConfirmLeave() {
    this.closeLeaveConfirm(true);
  }

  handleCancelLeave() {
    this.closeLeaveConfirm(false);
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }

  private showNicknameError(error: NicknameError) {
    this.toastService.show({type: ToastType.ERROR, message: nicknameErrorPhrase(error)});
  }

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
