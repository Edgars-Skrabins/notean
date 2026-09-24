import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {teamRoleLabel} from "@utils/teamRoleLabel";
import {TeamMember} from "@models/team.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {ConfirmDeleteDialogComponent} from "@components/confirm-delete-dialog/confirm-delete-dialog.component";

@Component({
  selector: 'app-manage-team',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    ConfirmDeleteDialogComponent
  ],
  templateUrl: './manage-team.component.html',
  styleUrl: './manage-team.component.css'
})
export class ManageTeamComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly teamRoleLabel = teamRoleLabel;

  teamName: string;
  members: TeamMember[] = [];
  isLoadingMembers = true;
  alertMessage = '';
  renameStatusMessage = '';
  showDeleteConfirm = false;

  private teamCode: string;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private translateService: TranslateService
  ) {
    const team = this.teamService.getCurrentTeam()!;
    this.teamCode = team.code;
    this.teamName = team.name;
  }

  get showDeleteTeam(): boolean {
    return this.teamService.getCurrentRole() === 'owner';
  }

  ngOnInit() {
    this.teamService.fetchTeamMembers(this.teamCode)
      .then((members) => {
        this.isLoadingMembers = false;
        this.members = members;
      });
  }

  handleRenameTeam() {
    if (!this.teamName) {
      return;
    }

    this.teamService.renameTeam(this.teamCode, this.teamName)
      .then((response) => {
        if (!response.success) {
          this.renameStatusMessage = '';
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.renameStatusMessage = this.translateService.instant(PHRASES.TEAM_NAME_UPDATED);
      });
  }

  handleDeleteTeam() {
    this.showDeleteConfirm = true;
  }

  handleCancelDeleteTeam() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDeleteTeam() {
    this.showDeleteConfirm = false;

    this.teamService.deleteTeam(this.teamCode)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.teamService.fetchMyTeam().then((nextTeam) => {
          this.navigationService.navigate(nextTeam ? AppRoutes.DASHBOARD : AppRoutes.TEAM_SELECTION);
        });
      });
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
