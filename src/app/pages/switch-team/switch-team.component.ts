import {Component, OnInit} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {teamRoleLabel} from "@utils/teamRoleLabel";
import {TeamWithRole} from "@models/team.model";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-switch-team',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    TranslateModule
  ],
  templateUrl: './switch-team.component.html',
  styleUrl: './switch-team.component.css'
})
export class SwitchTeamComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly teamRoleLabel = teamRoleLabel;

  teams: TeamWithRole[] = [];
  isLoading = true;
  alertMessage = '';

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService
  ) {
  }

  ngOnInit() {
    this.teamService.fetchMyTeams().then((teams) => {
      this.isLoading = false;
      this.teams = teams;
    });
  }

  isActive(team: TeamWithRole): boolean {
    return team.code === this.teamService.getCurrentTeam()?.code;
  }

  handleSelectTeam(team: TeamWithRole) {
    if (this.isActive(team)) {
      return;
    }

    this.teamService.activateTeam(team.code)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.navigationService.navigate(AppRoutes.DASHBOARD);
      });
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
