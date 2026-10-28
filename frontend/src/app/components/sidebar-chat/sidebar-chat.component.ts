import {Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ChatListService} from "@services/chat-list.service";
import {ChatChannel, ChatChannelSummary} from "@models/chat.model";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {UnreadBadgeComponent} from "@components/unread-badge/unread-badge.component";
import {CreateChatChannelDialogComponent} from "@components/create-chat-channel-dialog/create-chat-channel-dialog.component";
import {chatChannelRoute} from "@utils/chatRoute";

@Component({
  selector: 'app-sidebar-chat',
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    CdkDropList,
    CdkDrag,
    TranslatePipe,
    IconComponent,
    TooltipDirective,
    UnreadBadgeComponent,
    CreateChatChannelDialogComponent
  ],
  templateUrl: './sidebar-chat.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar-chat.component.css'
})
export class SidebarChatComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly chatChannelRoute = chatChannelRoute;

  @Input() collapsed = false;

  isCreateDialogOpen = false;

  constructor(private router: Router, protected chatListService: ChatListService) {
  }

  ngOnInit() {
    this.chatListService.load();
  }

  trackById(_index: number, channel: ChatChannelSummary): number {
    return channel.id;
  }

  handleToggle() {
    this.chatListService.toggleOpen();
  }

  handleOpen(channel: ChatChannelSummary) {
    this.router.navigate(chatChannelRoute(channel.id));
  }

  handleDrop(event: CdkDragDrop<ChatChannelSummary[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.chatListService.move(event.previousIndex, event.currentIndex);
    }
  }

  handleCreated(channel: ChatChannel) {
    this.isCreateDialogOpen = false;
    this.chatListService.add(channel);
    this.handleOpen(channel);
  }
}
