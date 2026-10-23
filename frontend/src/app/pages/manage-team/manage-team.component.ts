import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {teamRoleLabel} from "@utils/teamRoleLabel";
import {TeamFeature, TeamFeatures, TeamMember} from "@models/team.model";
import {ToastType} from "@models/toast.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {TeamCodeDisplayComponent} from "@components/team-code-display/team-code-display.component";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {CheckboxComponent} from "@components/checkbox/checkbox.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-manage-team',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    ConfirmDialogComponent,
    TeamCodeDisplayComponent,
    AvatarComponent,
    CheckboxComponent
  ],
  templateUrl: './manage-team.component.html',
  styleUrl: './manage-team.component.css'
})
export class ManageTeamComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly teamRoleLabel = teamRoleLabel;
  protected readonly featureOptions: { feature: TeamFeature; label: string }[] = [
    {feature: 'pages', label: PHRASES.FEATURE_PAGES},
    {feature: 'diagrams', label: PHRASES.FEATURE_DIAGRAMS},
    {feature: 'boards', label: PHRASES.FEATURE_BOARDS},
  ];

  teamName: string;
  members: TeamMember[] = [];
  isLoadingMembers = true;
  alertMessage = '';
  renameStatusMessage = '';
  showDeleteConfirm = false;
  features: TeamFeatures;

  protected teamCode: string;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private translateService: TranslateService,
    private toastService: ToastService
  ) {
    const team = this.teamService.getCurrentTeam()!;
    this.teamCode = team.code;
    this.teamName = team.name;
    this.features = {
      pages: this.teamService.isFeatureEnabled('pages'),
      diagrams: this.teamService.isFeatureEnabled('diagrams'),
      boards: this.teamService.isFeatureEnabled('boards'),
    };
  }

  get isOwner(): boolean {
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
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.renameStatusMessage = this.translateService.instant(PHRASES.TEAM_NAME_UPDATED);
      });
  }

  handleFeatureChange(feature: TeamFeature, enabled: boolean) {
    this.features = {...this.features, [feature]: enabled};

    return this.teamService.updateFeatures(this.teamCode, {[feature]: enabled})
      .then((response) => {
        if (!response.success) {
          this.features = {...this.features, [feature]: !enabled};
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }

        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.FEATURES_UPDATED});
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
          this.alertMessage = errorPhrase(response.code);
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
