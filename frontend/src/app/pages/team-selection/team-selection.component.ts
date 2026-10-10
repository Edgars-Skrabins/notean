import {Component, OnInit} from '@angular/core';
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
export class TeamSelectionComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  teamCount = 0;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService
  ) {
  }

  get hasTeam(): boolean {
    return this.teamService.getCurrentTeam() !== null;
  }

  get showSwitchTeam(): boolean {
    return this.teamCount > 1;
  }

  ngOnInit() {
    this.teamService.fetchMyTeams().then((teams) => {
      this.teamCount = teams.length;
    });
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }

  handleGoToJoinTeam() {
    this.navigationService.navigate(AppRoutes.JOIN_TEAM);
  }

  handleGoToSwitchTeam() {
    this.navigationService.navigate(AppRoutes.SWITCH_TEAM);
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
