import {Injectable} from '@angular/core';
import {BehaviorSubject, map, Observable, skip} from 'rxjs';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {ChatChannelScope, ChatChannelSummary, ChatMessage} from "@models/chat.model";
import {ChatService} from "@services/chat.service";
import {ChatCableService} from "@services/chat-cable.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {AuthService} from "@services/auth.service";

const ORDER_KEY_PREFIX = 'chatChannelOrder:';
const OPEN_KEY = 'sidebarChatOpen';

export function orderChatChannels(channels: ChatChannelSummary[], storedOrder: number[]): ChatChannelSummary[] {
  const byId = new Map(channels.map((channel) => [channel.id, channel]));
  const ordered = storedOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  const known = new Set(storedOrder);
  const unordered = channels
    .filter((channel) => !known.has(channel.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...unordered, ...ordered];
}

@Injectable({
  providedIn: 'root',
})
export class ChatListService {
  private channelsSubject = new BehaviorSubject<ChatChannelSummary[]>([]);
  private creatableScopesSubject = new BehaviorSubject<ChatChannelScope[]>([]);
  private activeChannelId: number | null = null;

  readonly channels$: Observable<ChatChannelSummary[]> = this.channelsSubject.asObservable();
  readonly creatableScopes$: Observable<ChatChannelScope[]> = this.creatableScopesSubject.asObservable();
  readonly totalUnread$: Observable<number> = this.channels$.pipe(map((channels) => channels.reduce((total, channel) => total + channel.unreadCount, 0)));

  creatableProjectIds: number[] = [];
  isOpen = localStorage.getItem(OPEN_KEY) !== 'false';

  constructor(
    private chatService: ChatService,
    private chatCableService: ChatCableService,
    private teamService: TeamService,
    private teamChannelService: TeamChannelService,
    private projectFilterService: ProjectFilterService,
    private authService: AuthService
  ) {
    this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => this.load());
    this.teamService.features$.pipe(map((features) => features.chat), skip(1)).subscribe(() => this.load());
    this.teamChannelService.membersChanged$.subscribe(() => this.load());
    this.chatCableService.channelsChanged$.subscribe(() => this.load());
    this.chatCableService.channelUpserted$.subscribe((channel) => this.upsert(channel));
    this.chatCableService.channelRemoved$.subscribe((id) => this.remove(id));
    this.chatCableService.messageCreated$.subscribe((message) => this.handleMessage(message));
  }

  async load() {
    if (!this.teamService.isFeatureEnabled('chat')) {
      this.channelsSubject.next([]);
      this.creatableScopesSubject.next([]);
      this.creatableProjectIds = [];
      return null;
    }

    const teamCode = this.teamService.getCurrentTeamCode();
    const response = await this.chatService.listChannels(teamCode, this.projectFilterService.getSelectedProjectId());
    if (response.success) {
      this.channelsSubject.next(orderChatChannels(response.channels, this.readOrder(teamCode)));
      this.creatableScopesSubject.next(response.creatableScopes);
      this.creatableProjectIds = response.creatableProjectIds;
    }
    return response;
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
    localStorage.setItem(OPEN_KEY, String(this.isOpen));
  }

  move(previousIndex: number, currentIndex: number) {
    const channels = [...this.channelsSubject.value];
    moveItemInArray(channels, previousIndex, currentIndex);
    this.publish(channels);
  }

  add(channel: ChatChannelSummary) {
    if (!this.matchesFilter(channel)) {
      return;
    }
    this.publish([channel, ...this.channelsSubject.value.filter((existing) => existing.id !== channel.id)]);
  }

  upsert(channel: ChatChannelSummary) {
    const existing = this.channelsSubject.value.find((candidate) => candidate.id === channel.id);
    if (!existing) {
      if (this.matchesFilter(channel)) {
        this.load();
      }
      return;
    }

    this.channelsSubject.next(this.channelsSubject.value.map((candidate) => candidate.id === channel.id
      ? {...candidate, name: channel.name, gifRating: channel.gifRating, lastMessageAt: channel.lastMessageAt}
      : candidate));
  }

  remove(id: number) {
    if (this.channelsSubject.value.some((channel) => channel.id === id)) {
      this.publish(this.channelsSubject.value.filter((channel) => channel.id !== id));
    }
  }

  setActive(id: number | null) {
    this.activeChannelId = id;
  }

  markRead(id: number) {
    this.setUnread(id, 0);
  }

  isActiveAndVisible(id: number): boolean {
    return this.activeChannelId === id && document.visibilityState === 'visible';
  }

  private handleMessage(message: ChatMessage) {
    if (message.author.id === this.authService.getCurrentUser()?.id || this.isActiveAndVisible(message.chatChannelId)) {
      return;
    }
    const channel = this.channelsSubject.value.find((candidate) => candidate.id === message.chatChannelId);
    if (channel) {
      this.setUnread(channel.id, channel.unreadCount + 1);
    }
  }

  private setUnread(id: number, unreadCount: number) {
    this.channelsSubject.next(this.channelsSubject.value.map((channel) => channel.id === id ? {...channel, unreadCount} : channel));
  }

  private matchesFilter(channel: ChatChannelSummary): boolean {
    const projectId = this.projectFilterService.getSelectedProjectId();
    return !projectId || channel.projectId === null || channel.projectId === projectId;
  }

  private publish(channels: ChatChannelSummary[]) {
    this.channelsSubject.next(channels);
    localStorage.setItem(this.orderKey(this.teamService.getCurrentTeamCode()), JSON.stringify(channels.map((channel) => channel.id)));
  }

  private readOrder(teamCode: string): number[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.orderKey(teamCode)) ?? '[]');
      return Array.isArray(stored) ? stored.filter((id): id is number => typeof id === 'number') : [];
    } catch {
      return [];
    }
  }

  private orderKey(teamCode: string): string {
    return `${ORDER_KEY_PREFIX}${teamCode}`;
  }
}
