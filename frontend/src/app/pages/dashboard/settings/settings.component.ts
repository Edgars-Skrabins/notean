import {Component, OnDestroy} from '@angular/core';
import {NgIf} from "@angular/common";
import {Subscription} from "rxjs";
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {SettingsService} from "@services/settings.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {UserSettings} from "@models/settings.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {CheckboxComponent} from "@components/checkbox/checkbox.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {AppRoutes} from "../../../app/app-routes.enum";

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    NgIf,
    TranslateModule,
    CheckboxComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements HasUnsavedChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;

  savedSettings: UserSettings;
  settings: UserSettings;
  isSaving = false;
  isLeaveConfirmOpen = false;

  private resolveLeave: ((canLeave: boolean) => void) | null = null;
  private settingsSubscription: Subscription;

  constructor(
    private navigationService: NavigationService,
    private settingsService: SettingsService,
    private toastService: ToastService
  ) {
    this.savedSettings = this.settingsService.getSettings();
    this.settings = {...this.savedSettings};
    this.settingsSubscription = this.settingsService.settings$.subscribe((settings) => {
      if (!this.hasUnsavedChanges) {
        this.savedSettings = settings;
        this.settings = {...settings};
      }
    });
  }

  get hasUnsavedChanges(): boolean {
    return (Object.keys(this.settings) as (keyof UserSettings)[])
      .some((key) => this.settings[key] !== this.savedSettings[key]);
  }

  ngOnDestroy() {
    this.settingsSubscription.unsubscribe();
  }

  handleSettingChange(key: keyof UserSettings, checked: boolean) {
    this.settings = {...this.settings, [key]: checked};
  }

  handleSave() {
    if (!this.hasUnsavedChanges || this.isSaving) {
      return;
    }

    this.isSaving = true;

    this.settingsService.update(this.settings)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED});
          return;
        }

        this.savedSettings = response.settings;
        this.settings = {...response.settings};
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.SETTINGS_SAVED});
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

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
