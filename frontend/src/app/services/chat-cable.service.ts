import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {CableService, CableSubscription} from "@services/cable.service";
import {mapChatChannelSummary, mapChatMessage, mapChatReaction, RawChatChannelSummary, RawChatMessage, RawChatReaction} from "@services/chat.service";
import {mapBoardUser, RawBoardUser} from "@services/board.service";
import {ChatChannelSummary, ChatMessage, ChatReaction} from "@models/chat.model";
import {BoardUser} from "@models/board.model";

export const TYPING_PING_INTERVAL_MS = 3000;

type ChatCableMessage =
  | { type: 'message_created' | 'message_updated'; chat_channel_id: number; message: RawChatMessage }
  | { type: 'message_deleted'; chat_channel_id: number; message_id: number }
  | { type: 'reactions_changed'; chat_channel_id: number; message_id: number; reactions: RawChatReaction[] }
  | { type: 'channel_upserted'; chat_channel: RawChatChannelSummary }
  | { type: 'channel_removed'; chat_channel_id: number }
  | { type: 'channels_changed' }
  | { type: 'typing'; chat_channel_id: number; user: RawBoardUser };

export interface ChatMessageRemoval {
  channelId: number;
  messageId: number;
}

export interface ChatReactionsChange {
  channelId: number;
  messageId: number;
  reactions: ChatReaction[];
}

export interface ChatTyping {
  channelId: number;
  user: BoardUser;
}

@Injectable({
  providedIn: 'root',
})
export class ChatCableService {
  private subscription: CableSubscription | null = null;
  private teamCode: string | null = null;
  private lastTypingPing = new Map<number, number>();
  private messageCreatedSubject = new Subject<ChatMessage>();
  private messageUpdatedSubject = new Subject<ChatMessage>();
  private messageDeletedSubject = new Subject<ChatMessageRemoval>();
  private reactionsChangedSubject = new Subject<ChatReactionsChange>();
  private channelUpsertedSubject = new Subject<ChatChannelSummary>();
  private channelRemovedSubject = new Subject<number>();
  private channelsChangedSubject = new Subject<void>();
  private typingSubject = new Subject<ChatTyping>();

  readonly messageCreated$: Observable<ChatMessage> = this.messageCreatedSubject.asObservable();
  readonly messageUpdated$: Observable<ChatMessage> = this.messageUpdatedSubject.asObservable();
  readonly messageDeleted$: Observable<ChatMessageRemoval> = this.messageDeletedSubject.asObservable();
  readonly reactionsChanged$: Observable<ChatReactionsChange> = this.reactionsChangedSubject.asObservable();
  readonly channelUpserted$: Observable<ChatChannelSummary> = this.channelUpsertedSubject.asObservable();
  readonly channelRemoved$: Observable<number> = this.channelRemovedSubject.asObservable();
  readonly channelsChanged$: Observable<void> = this.channelsChangedSubject.asObservable();
  readonly typing$: Observable<ChatTyping> = this.typingSubject.asObservable();

  constructor(private cableService: CableService) {
  }

  connect(teamCode: string) {
    if (this.subscription && this.teamCode === teamCode) {
      return;
    }
    this.disconnect();
    this.teamCode = teamCode;

    this.subscription = this.cableService.subscribe(
      {channel: 'ChatCable', team_code: teamCode},
      {
        received: (data: ChatCableMessage) => this.handleMessage(data),
      }
    );
  }

  handleMessage(data: ChatCableMessage) {
    switch (data.type) {
      case 'message_created':
        this.messageCreatedSubject.next(mapChatMessage(data.message));
        break;
      case 'message_updated':
        this.messageUpdatedSubject.next(mapChatMessage(data.message));
        break;
      case 'message_deleted':
        this.messageDeletedSubject.next({channelId: data.chat_channel_id, messageId: data.message_id});
        break;
      case 'reactions_changed':
        this.reactionsChangedSubject.next({channelId: data.chat_channel_id, messageId: data.message_id, reactions: data.reactions.map(mapChatReaction)});
        break;
      case 'channel_upserted':
        this.channelUpsertedSubject.next(mapChatChannelSummary(data.chat_channel));
        break;
      case 'channel_removed':
        this.channelRemovedSubject.next(data.chat_channel_id);
        break;
      case 'channels_changed':
        this.channelsChangedSubject.next();
        break;
      case 'typing':
        this.typingSubject.next({channelId: data.chat_channel_id, user: mapBoardUser(data.user)});
        break;
    }
  }

  sendTyping(channelId: number, now = Date.now()) {
    if (now - (this.lastTypingPing.get(channelId) ?? 0) < TYPING_PING_INTERVAL_MS) {
      return;
    }
    this.lastTypingPing.set(channelId, now);
    this.subscription?.perform('typing', {chat_channel_id: channelId});
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.teamCode = null;
    this.lastTypingPing.clear();
  }
}
