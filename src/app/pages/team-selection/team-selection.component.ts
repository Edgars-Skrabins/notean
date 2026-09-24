import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {NgIf} from "@angular/common";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-team-selection',
  standalone: true,
  imports: [
    TranslateModule,
    NgIf,
    AuthCardComponent
  ],
  templateUrl: './team-selection.component.html',
  styleUrl: './team-selection.component.css'
})
export class TeamSelectionComponent {
  protected readonly PHRASES = PHRASES;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService
  ) {
  }

  get hasTeam(): boolean {
    return this.teamService.getCurrentTeam() !== null;
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }

  handleGoToJoinTeam() {
    this.navigationService.navigate(AppRoutes.JOIN_TEAM);
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
