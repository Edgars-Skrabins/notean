import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {TranslatePipe, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH} from "@config/contentLimits";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {ToastService} from "@services/toast.service";
import {teamRoleLabel} from "@utils/teamRoleLabel";
import {TeamFeature, TeamFeatures, TeamMember} from "@models/team.model";
import {ToastType} from "@models/toast.model";
import {MenuButtonOption} from "@models/menu-button.model";
import {AppRoutes} from "../../app/app-routes.enum";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {TeamCodeDisplayComponent} from "@components/team-code-display/team-code-display.component";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {CheckboxComponent} from "@components/checkbox/checkbox.component";
import {MenuButtonComponent} from "@components/menu-button/menu-button.component";
import {errorPhrase} from "@utils/errorPhrase";
import {EscapeService} from "@services/escape.service";
import {AttachmentService} from "@services/attachment.service";
import {StorageUsage} from "@models/attachment.model";
import {formatBytes} from "@utils/formatBytes";

export type MemberAction = 'make_admin' | 'make_user' | 'transfer_ownership' | 'remove';

const MEMBER_ACTION_LABELS: Record<MemberAction, string> = {
  make_admin: PHRASES.MAKE_ADMIN,
  make_user: PHRASES.MAKE_USER,
  transfer_ownership: PHRASES.TRANSFER_OWNERSHIP,
  remove: PHRASES.REMOVE_FROM_TEAM,
};

const MEMBER_ACTION_CONFIRMS: Record<MemberAction, string> = {
  make_admin: PHRASES.CONFIRM_MAKE_ADMIN,
  make_user: PHRASES.CONFIRM_MAKE_USER,
  transfer_ownership: PHRASES.CONFIRM_TRANSFER_OWNERSHIP,
  remove: PHRASES.CONFIRM_REMOVE_MEMBER,
};

const MEMBER_ACTION_TOASTS: Record<MemberAction, string> = {
  make_admin: PHRASES.MEMBER_ROLE_UPDATED,
  make_user: PHRASES.MEMBER_ROLE_UPDATED,
  transfer_ownership: PHRASES.OWNERSHIP_TRANSFERRED,
  remove: PHRASES.MEMBER_REMOVED,
};

@Component({
  selector: 'app-manage-team',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslatePipe,
    ConfirmDialogComponent,
    TeamCodeDisplayComponent,
    AvatarComponent,
    CheckboxComponent,
    MenuButtonComponent
  ],
  templateUrl: './manage-team.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './manage-team.component.css'
})
export class ManageTeamComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly teamRoleLabel = teamRoleLabel;
  protected readonly featureOptions: { feature: TeamFeature; label: string }[] = [
    {feature: 'pages', label: PHRASES.FEATURE_PAGES},
    {feature: 'diagrams', label: PHRASES.FEATURE_DIAGRAMS},
    {feature: 'boards', label: PHRASES.FEATURE_BOARDS},
  ];

  teamName: string;
  members: TeamMember[] = [];
  memberActions: Record<number, MenuButtonOption[]> = {};
  isLoadingMembers = true;
  alertMessage = '';
  renameStatusMessage = '';
  showDeleteConfirm = false;
  pendingAction: { member: TeamMember; action: MemberAction } | null = null;
  features: TeamFeatures;
  storage: StorageUsage | null = null;

  protected teamCode: string;

  private unregisterEscape = () => {};
  private membersChangedSubscription: Subscription | null = null;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService,
    private translateService: TranslateService,
    private toastService: ToastService,
    private escapeService: EscapeService,
    private teamChannelService: TeamChannelService,
    private attachmentService: AttachmentService
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

  get pendingActionMessage(): string {
    if (!this.pendingAction) {
      return '';
    }

    return this.translateService.instant(MEMBER_ACTION_CONFIRMS[this.pendingAction.action], {name: this.pendingAction.member.nickname});
  }

  get storageParams(): { used: string; quota: string } | null {
    return this.storage ? {used: formatBytes(this.storage.usedBytes), quota: formatBytes(this.storage.quotaBytes)} : null;
  }

  get pendingActionLabel(): string {
    return this.pendingAction ? MEMBER_ACTION_LABELS[this.pendingAction.action] : '';
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleGoBack());
    this.teamChannelService.connect(this.teamCode);
    this.membersChangedSubscription = this.teamChannelService.membersChanged$.subscribe(() => this.loadMembers());
    this.loadMembers();
    this.loadStorage();
  }

  ngOnDestroy() {
    this.unregisterEscape();
    this.membersChangedSubscription?.unsubscribe();
    this.teamChannelService.disconnect();
  }

  actionsFor(member: TeamMember): MemberAction[] {
    const role = this.teamService.getCurrentRole();
    if (member.role === 'owner') {
      return [];
    }

    if (role === 'owner') {
      return [member.role === 'user' ? 'make_admin' : 'make_user', 'transfer_ownership', 'remove'];
    }

    if (role === 'admin' && member.role === 'user') {
      return ['remove'];
    }

    return [];
  }

  handleMemberAction(member: TeamMember, action: string | number | null) {
    this.pendingAction = {member, action: action as MemberAction};
  }

  handleCancelMemberAction() {
    this.pendingAction = null;
  }

  handleConfirmMemberAction() {
    const pending = this.pendingAction;
    this.pendingAction = null;
    if (!pending) {
      return Promise.resolve();
    }

    return this.runMemberAction(pending.member, pending.action)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.setMembers(response.members);
        this.toastService.show({type: ToastType.SUCCESS, message: MEMBER_ACTION_TOASTS[pending.action]});
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

  private loadMembers() {
    return this.teamService.fetchTeamMembers(this.teamCode)
      .then((members) => {
        this.isLoadingMembers = false;
        this.setMembers(members);
      });
  }

  private setMembers(members: TeamMember[]) {
    this.members = members;
    this.memberActions = Object.fromEntries(members.map((member) => [
      member.id,
      this.actionsFor(member).map((action) => ({value: action, labelKey: MEMBER_ACTION_LABELS[action]})),
    ]));
  }

  private runMemberAction(member: TeamMember, action: MemberAction) {
    if (action === 'remove') {
      return this.teamService.removeMember(this.teamCode, member.id);
    }

    if (action === 'transfer_ownership') {
      return this.teamService.transferOwnership(this.teamCode, member.id);
    }

    return this.teamService.updateMemberRole(this.teamCode, member.id, action === 'make_admin' ? 'admin' : 'user');
  }

  private loadStorage() {
    this.attachmentService.storageUsage(this.teamCode)
      .then((response) => {
        this.storage = response.success ? response.storage : null;
      });
  }
}
