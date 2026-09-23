import {Component, HostListener} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {NgIf} from "@angular/common";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf
  ],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.css'
})
export class DashboardHeaderComponent {
  protected readonly PHRASES = PHRASES;

  isMenuOpen = false;

  constructor(
    private navigationService: NavigationService,
    private authService: AuthService,
    private teamService: TeamService
  ) {
  }

  get username(): string {
    return this.authService.getCurrentUser()?.username ?? '';
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.dashboardHeader__menu')) {
      this.closeMenu();
    }
  }

  handleGoToProfile() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.PROFILE);
  }

  handleGoToSettings() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.SETTINGS);
  }

  handleGoToTeams() {
    this.closeMenu();
    this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
  }

  handleLogout() {
    this.closeMenu();
    this.authService.logout();
    this.teamService.clearCurrentTeam();
    this.navigationService.navigate(AppRoutes.LOGIN);
  }
}
