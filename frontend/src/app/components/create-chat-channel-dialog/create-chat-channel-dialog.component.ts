import {Component, EventEmitter, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ChatChannel, ChatChannelScope} from '@models/chat.model';
import {DropdownOption} from '@models/dropdown.model';
import {BoardUser} from '@models/board.model';
import {ChatService} from '@services/chat.service';
import {ChatListService} from '@services/chat-list.service';
import {TeamService} from '@services/team.service';
import {AuthService} from '@services/auth.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {errorPhrase} from '@utils/errorPhrase';
import {DropdownComponent} from '@components/dropdown/dropdown.component';
import {CreateNamedItemDialogComponent} from '@components/create-named-item-dialog/create-named-item-dialog.component';
import {ChatMemberPickerComponent} from '@components/chat-member-picker/chat-member-picker.component';

const SCOPE_PHRASES: Record<ChatChannelScope, string> = {
  team: PHRASES.CHANNEL_SCOPE_TEAM,
  project: PHRASES.CHANNEL_SCOPE_PROJECT,
  users: PHRASES.CHANNEL_SCOPE_USERS,
};

@Component({
  selector: 'app-create-chat-channel-dialog',
  imports: [
    NgIf,
    TranslatePipe,
    DropdownComponent,
    CreateNamedItemDialogComponent,
    ChatMemberPickerComponent
  ],
  templateUrl: './create-chat-channel-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './create-chat-channel-dialog.component.css'
})
export class CreateChatChannelDialogComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  @Output() created = new EventEmitter<ChatChannel>();
  @Output() cancelled = new EventEmitter<void>();

  scopeOptions: DropdownOption[] = [];
  projectOptions: DropdownOption[] = [];
  scope: ChatChannelScope = 'team';
  projectId: number | null = null;
  members: BoardUser[] = [];
  memberIds: number[] = [];
  currentUserId: number | null;
  errorMessage = '';
  saving = false;

  constructor(
    private chatService: ChatService,
    private chatListService: ChatListService,
    private teamService: TeamService,
    private authService: AuthService,
    private projectFilterService: ProjectFilterService,
    private translateService: TranslateService
  ) {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
  }

  ngOnInit() {
    let scopes: ChatChannelScope[] = [];
    this.chatListService.creatableScopes$.subscribe((value) => scopes = value).unsubscribe();
    this.scopeOptions = scopes.map((scope) => ({value: scope, labelKey: SCOPE_PHRASES[scope]}));
    this.scope = scopes[0] ?? 'team';

    const allowed = new Set(this.chatListService.creatableProjectIds);
    this.projectOptions = this.projectFilterService.getProjects()
      .filter((project) => allowed.has(project.id))
      .map((project) => ({value: project.id, label: project.name}));
    const selected = this.projectFilterService.getSelectedProjectId();
    this.projectId = selected && allowed.has(selected) ? selected : (this.projectOptions[0]?.value as number | undefined) ?? null;

    if (scopes.includes('users')) {
      this.teamService.fetchTeamMembers(this.teamService.getCurrentTeamCode()).then((members) => this.members = members);
    }
  }

  get defaultName(): string {
    return this.translateService.instant(PHRASES.UNTITLED_CHANNEL);
  }

  handleScopeChange(value: string | number | null) {
    this.scope = value as ChatChannelScope;
    this.errorMessage = '';
  }

  async handleConfirm(event: { title: string }) {
    if (this.saving) {
      return;
    }
    this.saving = true;
    const response = await this.chatService.createChannel(this.teamService.getCurrentTeamCode(), {
      name: event.title,
      scope: this.scope,
      projectId: this.scope === 'project' ? this.projectId : null,
      memberIds: this.scope === 'users' ? this.memberIds : [],
    });
    this.saving = false;

    if (response.success) {
      this.created.emit(response.channel);
    } else {
      this.errorMessage = errorPhrase(response.code);
    }
  }
}
