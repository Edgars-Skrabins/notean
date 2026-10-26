import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgFor, NgIf} from "@angular/common";
import {Subscription} from "rxjs";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {AVATAR_COLORS, AVATAR_IMAGE_MAX_BYTES, AVATAR_IMAGE_TYPES, AvatarColor} from "@config/avatarColors";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {AvatarService} from "@services/avatar.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";
import {ToastType} from "@models/toast.model";
import {Avatar, AvatarUpdate} from "@models/avatar.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {nicknameErrorPhrase, validateNickname} from "@utils/nicknameValidation";
import {isPasswordLongEnough} from "@utils/passwordValidation";
import {errorPhrase} from "@utils/errorPhrase";
import {resizeAvatar} from "@utils/resizeAvatar";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {ButtonComponent} from "@components/button/button.component";
import {AppRoutes} from "../../../app/app-routes.enum";
import {EscapeService} from "@services/escape.service";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    TranslateModule,
    ConfirmDialogComponent,
    AvatarComponent,
    ButtonComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements HasUnsavedChanges, OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly AVATAR_COLORS = AVATAR_COLORS;
  protected readonly AVATAR_IMAGE_TYPES = AVATAR_IMAGE_TYPES;

  savedNickname: string;
  nickname: string;
  savedAvatar: Avatar | null;
  pendingColor: AvatarColor | null;
  pendingImage: File | null = null;
  pendingImagePreviewUrl: string | null = null;
  pendingRemoveImage = false;
  isSaving = false;
  isLeaveConfirmOpen = false;
  isDeleteAccountConfirmOpen = false;
  isDeletingAccount = false;
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  isChangingPassword = false;
  passwordError: string | null = null;

  private isAccountDeleted = false;
  private resolveLeave: ((canLeave: boolean) => void) | null = null;
  private avatarSubscription: Subscription;

  private unregisterEscape = () => {};

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private toastService: ToastService,
    private avatarService: AvatarService,
    private escapeService: EscapeService,
    private authService: AuthService,
    private sessionService: SessionService,
    private translateService: TranslateService
  ) {
    this.savedNickname = this.teamService.getCurrentNickname() ?? '';
    this.nickname = this.savedNickname;
    this.savedAvatar = this.avatarService.getAvatar();
    this.pendingColor = this.savedAvatar?.color ?? null;
    this.avatarSubscription = this.avatarService.avatar$.subscribe((avatar) => {
      if (!this.hasAvatarChanges) {
        this.savedAvatar = avatar;
        this.pendingColor = avatar?.color ?? null;
      }
    });
  }

  get hasAvatarChanges(): boolean {
    return this.pendingImage !== null
      || this.pendingRemoveImage
      || this.pendingColor !== (this.savedAvatar?.color ?? null);
  }

  get hasUnsavedChanges(): boolean {
    if (this.isAccountDeleted) {
      return false;
    }
    return this.nickname !== this.savedNickname || this.hasAvatarChanges;
  }

  get canChangePassword(): boolean {
    return !this.isChangingPassword
      && this.currentPassword !== ''
      && this.newPassword !== ''
      && this.confirmNewPassword !== '';
  }

  get previewAvatar(): Avatar | null {
    if (!this.pendingColor) {
      return null;
    }
    return {
      color: this.pendingColor,
      imageUrl: this.pendingRemoveImage ? null : this.savedAvatar?.imageUrl ?? null,
    };
  }

  get hasImage(): boolean {
    return this.pendingImage !== null || (!this.pendingRemoveImage && !!this.savedAvatar?.imageUrl);
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
  }

  ngOnDestroy() {
    this.unregisterEscape();
    this.avatarSubscription.unsubscribe();
    this.revokePreviewUrl();
  }

  async handleFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!AVATAR_IMAGE_TYPES.includes(file.type)) {
      this.toastService.show({type: ToastType.ERROR, message: PHRASES.IMAGE_INVALID_TYPE});
      return;
    }

    const resized = await resizeAvatar(file);
    if (!resized) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase('AVATAR_IMAGE_INVALID')});
      return;
    }
    if (resized.size > AVATAR_IMAGE_MAX_BYTES) {
      this.toastService.show({type: ToastType.ERROR, message: PHRASES.IMAGE_TOO_LARGE});
      return;
    }

    this.revokePreviewUrl();
    this.pendingImage = resized;
    this.pendingImagePreviewUrl = URL.createObjectURL(resized);
    this.pendingRemoveImage = false;
  }

  handleRemoveImage() {
    this.revokePreviewUrl();
    this.pendingImage = null;
    this.pendingRemoveImage = !!this.savedAvatar?.imageUrl;
  }

  handleSelectColor(color: AvatarColor) {
    this.pendingColor = color;
  }

  async handleSave() {
    if (!this.hasUnsavedChanges || this.isSaving) {
      return;
    }

    const nicknameChanged = this.nickname !== this.savedNickname;
    if (nicknameChanged) {
      const nicknameError = validateNickname(this.nickname);
      if (nicknameError) {
        this.showError(nicknameErrorPhrase(nicknameError));
        return;
      }
    }

    this.isSaving = true;

    try {
      if (nicknameChanged) {
        const response = await this.teamService.updateNickname(this.nickname.trim());
        if (!response.success) {
          this.showError(errorPhrase(response.code));
          return;
        }
        this.savedNickname = response.nickname;
        this.nickname = response.nickname;
      }

      if (this.hasAvatarChanges) {
        const response = await this.avatarService.update(this.buildAvatarUpdate());
        if (!response.success) {
          this.showError(PHRASES.AVATAR_UPDATE_FAILED);
          return;
        }
        this.revokePreviewUrl();
        this.pendingImage = null;
        this.pendingRemoveImage = false;
        this.savedAvatar = response.avatar;
        this.pendingColor = response.avatar.color;
      }

      this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROFILE_UPDATED});
    } finally {
      this.isSaving = false;
    }
  }

  async handleChangePassword() {
    if (!this.canChangePassword) {
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = PHRASES.PASSWORDS_DO_NOT_MATCH;
      return;
    }
    if (!isPasswordLongEnough(this.newPassword)) {
      this.passwordError = PHRASES.PASSWORD_TOO_SHORT;
      return;
    }

    this.passwordError = null;
    this.isChangingPassword = true;

    try {
      const response = await this.authService.changePassword(this.currentPassword, this.newPassword);
      if (!response.success) {
        this.passwordError = errorPhrase(response.code);
        return;
      }
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PASSWORD_CHANGED});
    } finally {
      this.isChangingPassword = false;
    }
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

  handleDeleteAccount() {
    this.isDeleteAccountConfirmOpen = true;
  }

  handleCancelDeleteAccount() {
    this.isDeleteAccountConfirmOpen = false;
  }

  async handleConfirmDeleteAccount() {
    this.isDeleteAccountConfirmOpen = false;
    if (this.isDeletingAccount) {
      return;
    }

    this.isDeletingAccount = true;
    const response = await this.authService.deleteAccount();
    this.isDeletingAccount = false;

    if (!response.success) {
      if (response.code === 'OWNS_TEAMS') {
        const teams = response.teams.map((team) => team.name).join(', ');
        this.showError(this.translateService.instant(errorPhrase(response.code), {teams}));
        return;
      }
      this.showError(errorPhrase(response.code));
      return;
    }

    this.isAccountDeleted = true;
    this.authService.logout();
    this.sessionService.clear();
    this.navigationService.navigate(AppRoutes.LOGIN);
    this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.ACCOUNT_DELETED});
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }

  private buildAvatarUpdate(): AvatarUpdate {
    const update: AvatarUpdate = {};
    if (this.pendingColor && this.pendingColor !== this.savedAvatar?.color) {
      update.color = this.pendingColor;
    }
    if (this.pendingImage) {
      update.image = this.pendingImage;
    } else if (this.pendingRemoveImage) {
      update.removeImage = true;
    }
    return update;
  }

  private revokePreviewUrl() {
    if (this.pendingImagePreviewUrl) {
      URL.revokeObjectURL(this.pendingImagePreviewUrl);
      this.pendingImagePreviewUrl = null;
    }
  }

  private showError(message: string) {
    this.toastService.show({type: ToastType.ERROR, message});
  }

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
