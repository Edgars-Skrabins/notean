import {Component, ElementRef} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {AsyncPipe, NgIf} from "@angular/common";
import {OverlayModule} from "@angular/cdk/overlay";
import {PHRASES} from "@config/phrases";
import {MENU_POSITIONS} from "@config/overlayPositions";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {SessionService} from "@services/session.service";
import {AvatarService} from "@services/avatar.service";
import {LanguageSwitcherComponent} from "@components/language-switcher/language-switcher.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {ProjectSelectorComponent} from "@components/project-selector/project-selector.component";
import {GlobalSearchComponent} from "@components/global-search/global-search.component";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-dashboard-header',
  imports: [
    TranslateModule,
    NgIf,
    AsyncPipe,
    OverlayModule,
    LanguageSwitcherComponent,
    IconButtonComponent,
    AvatarComponent,
    ProjectSelectorComponent,
    GlobalSearchComponent
  ],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.css'
})
export class DashboardHeaderComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly MENU_POSITIONS = MENU_POSITIONS;

  isMenuOpen = false;

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private teamService: TeamService,
    private sessionService: SessionService,
    protected avatarService: AvatarService,
    private elementRef: ElementRef<HTMLElement>
  ) {
  }

  get nickname(): string {
    return this.teamService.getCurrentNickname() ?? '';
  }

  get showManageTeam(): boolean {
    const role = this.teamService.getCurrentRole();
    return role === 'admin' || role === 'owner';
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.closeMenu();
  }

  handleGoToProfile() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.PROFILE);
  }

  handleGoToSettings() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.SETTINGS);
  }

  handleGoToTeams() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
  }

  handleGoToManageTeam() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.MANAGE_TEAM);
  }

  handleLogout() {
    this.closeMenu();
    this.authService.logout();
    this.sessionService.clear();
    this.navigationService.navigate(AppRoutes.LOGIN);
  }

  private trigger(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector('.dashboardHeader__trigger');
  }
}
