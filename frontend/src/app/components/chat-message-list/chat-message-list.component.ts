import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ChatMessage, ChatReaction} from '@models/chat.model';
import {ChatMessageComponent} from '@components/chat-message/chat-message.component';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const LOAD_OLDER_THRESHOLD_PX = 80;
const NEAR_BOTTOM_PX = 120;

export function isGroupedMessage(previous: ChatMessage | undefined, message: ChatMessage, firstUnreadId: number | null): boolean {
  return !!previous
    && previous.author.id === message.author.id
    && message.id !== firstUnreadId
    && new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS;
}

@Component({
  selector: 'app-chat-message-list',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    ChatMessageComponent
  ],
  templateUrl: './chat-message-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-message-list.component.css'
})
export class ChatMessageListComponent implements AfterViewInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) messages: ChatMessage[] = [];
  @Input({required: true}) channelName!: string;
  @Input() firstUnreadId: number | null = null;
  @Input() hasMoreBefore = false;
  @Input() loadingOlder = false;
  @Input() typingText = '';
  @Input() currentUserId: number | null = null;
  @Input() canModerate = false;
  @Input() language = 'en';
  @Input() nicknames: Map<number, string> = new Map();
  @Output() loadOlder = new EventEmitter<void>();
  @Output() updated = new EventEmitter<ChatMessage>();
  @Output() deleted = new EventEmitter<number>();
  @Output() reactionsChanged = new EventEmitter<{ messageId: number; reactions: ChatReaction[] }>();

  @ViewChild('scroller', {static: true}) scroller!: ElementRef<HTMLDivElement>;

  private pinnedToBottom = true;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.scroller.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  trackById(_index: number, message: ChatMessage): number {
    return message.id;
  }

  isGrouped(index: number): boolean {
    return isGroupedMessage(this.messages[index - 1], this.messages[index], this.firstUnreadId);
  }

  handleScroll() {
    this.pinnedToBottom = this.isNearBottom();
    if (this.scroller.nativeElement.scrollTop < LOAD_OLDER_THRESHOLD_PX && this.hasMoreBefore && !this.loadingOlder) {
      this.loadOlder.emit();
    }
  }

  handleResize() {
    if (this.pinnedToBottom) {
      this.scrollToBottom();
    }
  }

  isNearBottom(): boolean {
    const element = this.scroller.nativeElement;
    return element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
  }

  scrollToBottom() {
    const element = this.scroller.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  scrollToMessage(id: number) {
    const target = this.scroller.nativeElement.querySelector(`[data-message-id="${id}"]`);
    if (target) {
      target.scrollIntoView({block: 'center'});
    } else {
      this.scrollToBottom();
    }
  }

  rememberPosition(): () => void {
    const element = this.scroller.nativeElement;
    const fromBottom = element.scrollHeight - element.scrollTop;
    return () => element.scrollTop = element.scrollHeight - fromBottom;
  }
}
