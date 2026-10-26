import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {teamRoleLabel} from "@utils/teamRoleLabel";
import {TeamWithRole} from "@models/team.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {errorPhrase} from "@utils/errorPhrase";
import {EscapeService} from "@services/escape.service";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";

@Component({
  selector: 'app-switch-team',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    ConfirmDialogComponent,
    TooltipDirective
  ],
  templateUrl: './switch-team.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './switch-team.component.css'
})
export class SwitchTeamComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly teamRoleLabel = teamRoleLabel;

  teams: TeamWithRole[] = [];
  isLoading = true;
  alertMessage = '';
  pendingLeave: TeamWithRole | null = null;

  private unregisterEscape = () => {};

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private escapeService: EscapeService,
    private translateService: TranslateService
  ) {
  }

  get pendingLeaveMessage(): string {
    return this.pendingLeave ? this.translateService.instant(PHRASES.CONFIRM_LEAVE_TEAM, {team: this.pendingLeave.name}) : '';
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
    this.teamService.fetchMyTeams().then((teams) => {
      this.isLoading = false;
      this.teams = teams;
    });
  }

  ngOnDestroy() {
    this.unregisterEscape();
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
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.navigationService.navigate(AppRoutes.DASHBOARD);
      });
  }

  handleLeaveTeam(team: TeamWithRole) {
    if (team.role === 'owner') {
      return;
    }

    this.pendingLeave = team;
  }

  handleCancelLeaveTeam() {
    this.pendingLeave = null;
  }

  handleConfirmLeaveTeam() {
    const team = this.pendingLeave;
    this.pendingLeave = null;
    if (!team) {
      return Promise.resolve();
    }

    const wasActive = this.isActive(team);
    return this.teamService.leaveTeam(team.code)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.teams = this.teams.filter((item) => item.code !== team.code);
        if (wasActive) {
          this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
        }
      });
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
