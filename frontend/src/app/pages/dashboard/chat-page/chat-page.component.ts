import {Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, Subscription} from 'rxjs';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {defaultLanguage} from '@config/translationConfig';
import {ChatChannel, ChatMessage, ChatReaction} from '@models/chat.model';
import {BoardUser} from '@models/board.model';
import {MentionContext} from '@models/mention.model';
import {ToastType} from '@models/toast.model';
import {ChatService} from '@services/chat.service';
import {ChatCableService} from '@services/chat-cable.service';
import {ChatListService} from '@services/chat-list.service';
import {TeamService} from '@services/team.service';
import {AuthService} from '@services/auth.service';
import {ToastService} from '@services/toast.service';
import {errorPhrase} from '@utils/errorPhrase';
import {AvatarStackComponent} from '@components/avatar-stack/avatar-stack.component';
import {ButtonComponent} from '@components/button/button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ChatMessageListComponent} from '@components/chat-message-list/chat-message-list.component';
import {ChatComposerComponent} from '@components/chat-composer/chat-composer.component';
import {ChatChannelSettingsDialogComponent} from '@components/chat-channel-settings-dialog/chat-channel-settings-dialog.component';
import {AppRoutes} from '../../../app/app-routes.enum';

export const TYPING_VISIBLE_MS = 5000;

export function typingPhrase(nicknames: string[]): { key: string; params: Record<string, string> } | null {
  if (nicknames.length === 0) {
    return null;
  }
  if (nicknames.length === 1) {
    return {key: PHRASES.TYPING_ONE, params: {name: nicknames[0]}};
  }
  if (nicknames.length === 2) {
    return {key: PHRASES.TYPING_TWO, params: {first: nicknames[0], second: nicknames[1]}};
  }
  return {key: PHRASES.TYPING_MANY, params: {}};
}

@Component({
  selector: 'app-chat-page',
  imports: [
    NgIf,
    TranslatePipe,
    AvatarStackComponent,
    ButtonComponent,
    IconButtonComponent,
    ChatMessageListComponent,
    ChatComposerComponent,
    ChatChannelSettingsDialogComponent
  ],
  templateUrl: './chat-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-page.component.css'
})
export class ChatPageComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @ViewChild(ChatMessageListComponent) list?: ChatMessageListComponent;

  channel: ChatChannel | null = null;
  messages: ChatMessage[] = [];
  firstUnreadId: number | null = null;
  hasMoreBefore = false;
  hasMoreAfter = false;
  loadingOlder = false;
  isSettingsOpen = false;
  nicknames = new Map<number, string>();
  typingText = '';
  readonly currentUserId: number | null;

  private lastReadMessageId = 0;
  private loadGeneration = 0;
  private typers = new Map<number, { nickname: string; timer: ReturnType<typeof setTimeout> }>();
  private subscriptions: Subscription[] = [];
  private visibilityListener = () => this.markReadIfVisible();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService,
    private chatCableService: ChatCableService,
    private chatListService: ChatListService,
    private teamService: TeamService,
    private authService: AuthService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) {
    this.currentUserId = this.authService.getCurrentUser()?.id ?? null;
  }

  get teamCode(): string {
    return this.teamService.getCurrentTeamCode();
  }

  get canModerate(): boolean {
    const role = this.teamService.getCurrentRole();
    return role === 'admin' || role === 'owner';
  }

  get language(): string {
    return this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage;
  }

  get mentionContext(): MentionContext {
    return {projectId: this.channel?.projectId ?? null};
  }

  get isMember(): boolean {
    return !!this.channel?.members.some((member) => member.id === this.currentUserId);
  }

  ngOnInit() {
    document.addEventListener('visibilitychange', this.visibilityListener);
    this.teamService.fetchTeamMembers(this.teamCode).then((members) => this.nicknames = new Map(members.map((member) => [member.id, member.nickname])));

    this.subscriptions.push(
      combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
        const around = Number(query.get('message')) || null;
        this.open(Number(params.get('id')), around);
      }),
      this.chatCableService.messageCreated$.subscribe((message) => this.handleMessageCreated(message)),
      this.chatCableService.messageUpdated$.subscribe((message) => this.replaceMessage(message)),
      this.chatCableService.messageDeleted$.subscribe(({channelId, messageId}) => {
        if (channelId === this.channel?.id) {
          this.removeMessage(messageId);
        }
      }),
      this.chatCableService.reactionsChanged$.subscribe(({channelId, messageId, reactions}) => {
        if (channelId === this.channel?.id) {
          this.setReactions({messageId, reactions});
        }
      }),
      this.chatCableService.channelUpserted$.subscribe((summary) => this.handleChannelUpserted(summary.id, summary.name, summary.gifRating)),
      this.chatCableService.channelRemoved$.subscribe((id) => {
        if (id === this.channel?.id) {
          this.leavePage(PHRASES.CHANNEL_REMOVED);
        }
      }),
      this.chatCableService.typing$.subscribe(({channelId, user}) => {
        if (channelId === this.channel?.id) {
          this.handleTyping(user);
        }
      }),
    );
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.visibilityListener);
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.typers.forEach(({timer}) => clearTimeout(timer));
    this.chatListService.setActive(null);
  }

  async open(channelId: number, aroundId: number | null) {
    const generation = ++this.loadGeneration;
    this.chatListService.setActive(channelId);
    this.typers.forEach(({timer}) => clearTimeout(timer));
    this.typers.clear();
    this.typingText = '';

    const [channelResponse, messagesResponse] = await Promise.all([
      this.chatService.getChannel(this.teamCode, channelId),
      this.chatService.listMessages(this.teamCode, channelId, aroundId ? {around: aroundId} : {}),
    ]);
    if (generation !== this.loadGeneration) {
      return;
    }
    if (!channelResponse.success || !messagesResponse.success) {
      this.leavePage(PHRASES.CHANNEL_REMOVED);
      return;
    }

    this.channel = channelResponse.channel;
    this.messages = messagesResponse.messages;
    this.hasMoreBefore = messagesResponse.hasMoreBefore;
    this.hasMoreAfter = messagesResponse.hasMoreAfter;
    this.lastReadMessageId = messagesResponse.lastReadMessageId;
    this.firstUnreadId = this.messages.find((message) => message.id > this.lastReadMessageId && message.author.id !== this.currentUserId)?.id ?? null;

    setTimeout(() => {
      const target = aroundId ?? this.firstUnreadId;
      if (target) {
        this.list?.scrollToMessage(target);
      } else {
        this.list?.scrollToBottom();
      }
      this.markReadIfVisible();
    });
  }

  async loadOlder() {
    if (!this.channel || this.loadingOlder || !this.messages.length) {
      return;
    }
    this.loadingOlder = true;
    const channelId = this.channel.id;
    const response = await this.chatService.listMessages(this.teamCode, channelId, {before: this.messages[0].id});
    this.loadingOlder = false;
    if (!response.success || channelId !== this.channel?.id) {
      return;
    }
    const restore = this.list?.rememberPosition();
    this.messages = [...response.messages, ...this.messages];
    this.hasMoreBefore = response.hasMoreBefore;
    setTimeout(() => restore?.());
  }

  jumpToLatest() {
    if (this.channel) {
      this.router.navigate(['/', AppRoutes.DASHBOARD, AppRoutes.CHAT, this.channel.id]);
    }
  }

  handleSent(message: ChatMessage) {
    this.appendMessage(message);
    this.lastReadMessageId = Math.max(this.lastReadMessageId, message.id);
    setTimeout(() => this.list?.scrollToBottom());
  }

  replaceMessage(message: ChatMessage) {
    this.messages = this.messages.map((existing) => existing.id === message.id ? message : existing);
  }

  removeMessage(id: number) {
    this.messages = this.messages.filter((message) => message.id !== id);
  }

  setReactions({messageId, reactions}: { messageId: number; reactions: ChatReaction[] }) {
    this.messages = this.messages.map((message) => message.id === messageId ? {...message, reactions} : message);
  }

  handleSettingsSaved(channel: ChatChannel) {
    this.isSettingsOpen = false;
    this.channel = channel;
    this.chatListService.upsert(channel);
  }

  handleSettingsDeleted() {
    const id = this.channel?.id;
    this.isSettingsOpen = false;
    if (id) {
      this.chatListService.remove(id);
    }
    this.leavePage(PHRASES.CHANNEL_DELETED, ToastType.SUCCESS);
  }

  async handleLeave() {
    if (!this.channel) {
      return;
    }
    const id = this.channel.id;
    const response = await this.chatService.leaveChannel(this.teamCode, id);
    if (response.success) {
      this.chatListService.remove(id);
      this.leavePage(PHRASES.CHANNEL_LEFT, ToastType.SUCCESS);
    } else {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
    }
  }

  private handleMessageCreated(message: ChatMessage) {
    if (message.chatChannelId !== this.channel?.id || this.hasMoreAfter) {
      return;
    }
    const nearBottom = this.list?.isNearBottom() ?? true;
    this.clearTyper(message.author.id);
    this.appendMessage(message);
    if (nearBottom || message.author.id === this.currentUserId) {
      setTimeout(() => this.list?.scrollToBottom());
    }
    this.markReadIfVisible();
  }

  private appendMessage(message: ChatMessage) {
    if (!this.messages.some((existing) => existing.id === message.id)) {
      this.messages = [...this.messages, message];
    }
  }

  private handleChannelUpserted(id: number, name: string, gifRating: ChatChannel['gifRating']) {
    if (this.channel && this.channel.id === id) {
      this.channel = {...this.channel, name, gifRating};
      this.chatService.getChannel(this.teamCode, id).then((response) => {
        if (response.success && this.channel?.id === id) {
          this.channel = response.channel;
        }
      });
    }
  }

  private handleTyping(user: BoardUser) {
    this.clearTyper(user.id);
    const timer = setTimeout(() => {
      this.typers.delete(user.id);
      this.updateTypingText();
    }, TYPING_VISIBLE_MS);
    this.typers.set(user.id, {nickname: user.nickname, timer});
    this.updateTypingText();
  }

  private clearTyper(userId: number) {
    const typer = this.typers.get(userId);
    if (typer) {
      clearTimeout(typer.timer);
      this.typers.delete(userId);
      this.updateTypingText();
    }
  }

  private updateTypingText() {
    const phrase = typingPhrase([...this.typers.values()].map(({nickname}) => nickname));
    this.typingText = phrase ? this.translateService.instant(phrase.key, phrase.params) : '';
  }

  private markReadIfVisible() {
    if (!this.channel || !this.messages.length || this.hasMoreAfter || document.visibilityState !== 'visible') {
      return;
    }
    const channelId = this.channel.id;
    const lastId = this.messages[this.messages.length - 1].id;
    this.chatListService.markRead(channelId);
    if (lastId > this.lastReadMessageId) {
      this.lastReadMessageId = lastId;
      this.chatService.markRead(this.teamCode, channelId, lastId);
    }
  }

  private leavePage(message: string, type: ToastType = ToastType.INFO) {
    this.router.navigate(['/', AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME]);
    this.toastService.show({type, message});
  }
}
