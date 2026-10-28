import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {CdkConnectedOverlay, CdkOverlayOrigin} from '@angular/cdk/overlay';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {MESSAGE_MAX_LENGTH} from '@config/contentLimits';
import {MENU_POSITIONS} from '@config/overlayPositions';
import {ChatMessage, ChatReaction, ChatReactionsResponse} from '@models/chat.model';
import {ToastType} from '@models/toast.model';
import {ChatService} from '@services/chat.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {RecentReactionsService} from '@services/recent-reactions.service';
import {errorPhrase} from '@utils/errorPhrase';
import {ErrorCode} from '@config/errorCodes';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {MentionContentComponent} from '@components/mention-content/mention-content.component';
import {MentionTextEditorComponent} from '@components/mention-text-editor/mention-text-editor.component';
import {EmojiPickerComponent} from '@components/emoji-picker/emoji-picker.component';
import {ChatReactionsComponent} from '@components/chat-reactions/chat-reactions.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-chat-message',
  imports: [
    NgFor,
    NgIf,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    TranslatePipe,
    AvatarComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    MentionContentComponent,
    MentionTextEditorComponent,
    EmojiPickerComponent,
    ChatReactionsComponent,
    TooltipDirective
  ],
  templateUrl: './chat-message.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-message.component.css'
})
export class ChatMessageComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly MESSAGE_MAX_LENGTH = MESSAGE_MAX_LENGTH;
  protected readonly MENU_POSITIONS = MENU_POSITIONS;

  @Input({required: true}) message!: ChatMessage;
  @Input() grouped = false;
  @Input() currentUserId: number | null = null;
  @Input() canModerate = false;
  @Input() language = 'en';
  @Input() nicknames: Map<number, string> = new Map();
  @Output() updated = new EventEmitter<ChatMessage>();
  @Output() deleted = new EventEmitter<number>();
  @Output() reactionsChanged = new EventEmitter<ChatReaction[]>();

  editing = false;
  draft = '';
  isEmojiOpen = false;
  isConfirmingDelete = false;

  constructor(
    private chatService: ChatService,
    private teamService: TeamService,
    private toastService: ToastService,
    protected recentReactionsService: RecentReactionsService
  ) {
  }

  get isOwn(): boolean {
    return this.message.author.id === this.currentUserId;
  }

  get canEdit(): boolean {
    return this.isOwn && this.message.kind === 'text';
  }

  get canDelete(): boolean {
    return this.isOwn || this.canModerate;
  }

  get time(): string {
    return new Date(this.message.createdAt).toLocaleTimeString(this.language, {hour: '2-digit', minute: '2-digit'});
  }

  get exactTime(): string {
    return new Date(this.message.createdAt).toLocaleString(this.language);
  }

  startEdit() {
    this.draft = this.message.body;
    this.editing = true;
  }

  handleEditEscape(event: KeyboardEvent) {
    event.preventDefault();
    this.editing = false;
  }

  async saveEdit() {
    const body = this.draft.trim();
    if (!body || body === this.message.body) {
      this.editing = false;
      return;
    }
    const response = await this.chatService.editMessage(this.teamService.getCurrentTeamCode(), this.message.chatChannelId, this.message.id, body);
    if (response.success) {
      this.editing = false;
      this.updated.emit(response.message);
    } else {
      this.showError(response.code);
    }
  }

  async handleDeleteConfirmed() {
    this.isConfirmingDelete = false;
    const response = await this.chatService.deleteMessage(this.teamService.getCurrentTeamCode(), this.message.chatChannelId, this.message.id);
    if (response.success) {
      this.deleted.emit(this.message.id);
    } else {
      this.showError(response.code);
    }
  }

  handleEmojiPicked(emoji: string) {
    this.isEmojiOpen = false;
    this.react(emoji);
  }

  async toggleReaction(emoji: string) {
    const mine = this.message.reactions.some((reaction) => reaction.emoji === emoji && this.currentUserId !== null && reaction.userIds.includes(this.currentUserId));
    if (mine) {
      this.applyReactions(await this.chatService.removeReaction(this.teamService.getCurrentTeamCode(), this.message.chatChannelId, this.message.id, emoji));
    } else {
      this.react(emoji);
    }
  }

  private async react(emoji: string) {
    this.recentReactionsService.use(emoji);
    this.applyReactions(await this.chatService.addReaction(this.teamService.getCurrentTeamCode(), this.message.chatChannelId, this.message.id, emoji));
  }

  private applyReactions(response: ChatReactionsResponse) {
    if (response.success) {
      this.reactionsChanged.emit(response.reactions);
    } else {
      this.showError(response.code);
    }
  }

  private showError(code: ErrorCode) {
    this.toastService.show({type: ToastType.ERROR, message: errorPhrase(code)});
  }
}
