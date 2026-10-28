import {Component, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {CdkConnectedOverlay, CdkOverlayOrigin} from '@angular/cdk/overlay';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {MESSAGE_MAX_LENGTH} from '@config/contentLimits';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {ChatMessage, Gif} from '@models/chat.model';
import {MentionContext} from '@models/mention.model';
import {ToastType} from '@models/toast.model';
import {ChatService} from '@services/chat.service';
import {ChatCableService} from '@services/chat-cable.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {errorPhrase} from '@utils/errorPhrase';
import {MentionTextEditorComponent} from '@components/mention-text-editor/mention-text-editor.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {EmojiPickerComponent} from '@components/emoji-picker/emoji-picker.component';
import {GifPickerComponent} from '@components/gif-picker/gif-picker.component';

const GIF_COMMAND = /^\/gif(?:\s+([\s\S]*))?$/;

export function gifQuery(text: string): string | null {
  const match = text.match(GIF_COMMAND);
  return match ? (match[1] ?? '') : null;
}

@Component({
  selector: 'app-chat-composer',
  imports: [
    NgIf,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    TranslatePipe,
    MentionTextEditorComponent,
    IconButtonComponent,
    EmojiPickerComponent,
    GifPickerComponent
  ],
  templateUrl: './chat-composer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-composer.component.css'
})
export class ChatComposerComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly MESSAGE_MAX_LENGTH = MESSAGE_MAX_LENGTH;
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;
  protected readonly gifQuery = gifQuery;

  @Input({required: true}) channelId!: number;
  @Input({required: true}) channelName!: string;
  @Input() mentionContext: MentionContext = {};
  @Output() sent = new EventEmitter<ChatMessage>();

  @ViewChild(MentionTextEditorComponent) editor?: MentionTextEditorComponent;

  text = '';
  sending = false;
  isEmojiOpen = false;

  constructor(
    private chatService: ChatService,
    private chatCableService: ChatCableService,
    private teamService: TeamService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) {
  }

  get placeholder(): string {
    return this.translateService.instant(PHRASES.CHAT_MESSAGE_PLACEHOLDER, {name: this.channelName});
  }

  handleChange(text: string) {
    this.text = text;
    if (text.trim() && gifQuery(text) === null) {
      this.chatCableService.sendTyping(this.channelId);
    }
  }

  async handleSubmit() {
    const body = this.text.trim();
    if (!body || this.sending || gifQuery(this.text) !== null) {
      return;
    }
    this.sending = true;
    const response = await this.chatService.sendMessage(this.teamService.getCurrentTeamCode(), this.channelId, body);
    this.sending = false;
    if (response.success) {
      if (this.text.trim() === body) {
        this.text = '';
      }
      this.sent.emit(response.message);
    } else {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
    }
  }

  async handleGifPicked(gif: Gif) {
    const response = await this.chatService.sendGif(this.teamService.getCurrentTeamCode(), this.channelId, gif.id);
    if (response.success) {
      this.text = '';
      this.sent.emit(response.message);
      this.editor?.focus();
    } else {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
    }
  }

  handleEmojiPicked(emoji: string) {
    this.isEmojiOpen = false;
    this.editor?.insertText(emoji);
  }

  handleEscape(event: KeyboardEvent) {
    if (gifQuery(this.text) !== null) {
      event.preventDefault();
      this.text = '';
    }
  }
}
