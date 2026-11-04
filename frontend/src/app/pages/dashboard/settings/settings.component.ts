import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from "@angular/common";
import {Subscription} from "rxjs";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {SettingsService} from "@services/settings.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {ToggleSetting, UserSettings} from "@models/settings.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {SwitchComponent} from "@components/switch/switch.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {ThemeModeSwitchComponent} from "@components/theme-mode-switch/theme-mode-switch.component";
import {ThemePickerComponent} from "@components/theme-picker/theme-picker.component";
import {ThemeService} from "@services/theme.service";
import {ThemeKey, ThemeMode} from "@config/themes";
import {ResolvedThemeMode} from "@utils/themeDom";
import {AppRoutes} from "../../../app/app-routes.enum";
import {EscapeService} from "@services/escape.service";

@Component({
  selector: 'app-settings',
  imports: [
    NgIf,
    TranslatePipe,
    SwitchComponent,
    ConfirmDialogComponent,
    ThemeModeSwitchComponent,
    ThemePickerComponent
  ],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements HasUnsavedChanges, OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  savedSettings: UserSettings;
  settings: UserSettings;
  isSaving = false;
  isSavingToggles = false;
  isLeaveConfirmOpen = false;
  resolvedMode: ResolvedThemeMode = 'dark';

  private hasQueuedToggleSave = false;
  private resolveLeave: ((canLeave: boolean) => void) | null = null;
  private settingsSubscription: Subscription;
  private themeSubscription: Subscription;

  private unregisterEscape = () => {};

  constructor(
    private navigationService: NavigationService,
    private settingsService: SettingsService,
    private toastService: ToastService,
    private escapeService: EscapeService,
    private themeService: ThemeService
  ) {
    this.savedSettings = this.settingsService.getSettings();
    this.settings = {...this.savedSettings};
    this.settingsSubscription = this.settingsService.settings$.subscribe((settings) => {
      if (!this.hasUnsavedChanges && !this.isSavingToggles) {
        this.savedSettings = settings;
        this.settings = {...settings};
      }
    });
    this.themeSubscription = this.themeService.theme$.subscribe((active) => {
      this.resolvedMode = active.resolvedMode;
    });
  }

  get hasUnsavedChanges(): boolean {
    return this.settings.theme !== this.savedSettings.theme
      || this.settings.themeMode !== this.savedSettings.themeMode;
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
  }

  ngOnDestroy() {
    this.unregisterEscape();
    this.settingsSubscription.unsubscribe();
    this.themeSubscription.unsubscribe();
    this.themeService.apply(this.savedSettings.theme, this.savedSettings.themeMode);
  }

  handleSettingChange(key: ToggleSetting, checked: boolean) {
    this.settings = {...this.settings, [key]: checked};
    this.saveToggles();
  }

  handleThemeChange(theme: ThemeKey) {
    this.settings = {...this.settings, theme};
    this.themeService.preview(this.settings.theme, this.settings.themeMode);
  }

  handleModeChange(themeMode: ThemeMode) {
    this.settings = {...this.settings, themeMode};
    this.themeService.preview(this.settings.theme, this.settings.themeMode);
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

  private saveToggles() {
    if (this.isSavingToggles) {
      this.hasQueuedToggleSave = true;
      return;
    }

    this.isSavingToggles = true;

    this.settingsService.update({
      ...this.savedSettings,
      showFavoritesOnHome: this.settings.showFavoritesOnHome,
      showFavoritesInSidebar: this.settings.showFavoritesInSidebar,
      showMyWorkOnHome: this.settings.showMyWorkOnHome
    })
      .then((response) => {
        if (!response.success) {
          this.settings = {
            ...this.settings,
            showFavoritesOnHome: this.savedSettings.showFavoritesOnHome,
            showFavoritesInSidebar: this.savedSettings.showFavoritesInSidebar,
            showMyWorkOnHome: this.savedSettings.showMyWorkOnHome
          };
          this.hasQueuedToggleSave = false;
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.SETTINGS_SAVE_FAILED});
          return;
        }

        this.savedSettings = response.settings;
        if (this.hasUnsavedChanges) {
          this.themeService.preview(this.settings.theme, this.settings.themeMode);
        }
      })
      .finally(() => {
        this.isSavingToggles = false;
        if (this.hasQueuedToggleSave) {
          this.hasQueuedToggleSave = false;
          this.saveToggles();
        }
      });
  }

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
