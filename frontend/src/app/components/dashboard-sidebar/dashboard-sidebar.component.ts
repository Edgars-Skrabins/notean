import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {TeamService} from "@services/team.service";
import {NotificationChannelService} from "@services/notification-channel.service";
import {FavoritesListComponent} from "@components/favorites-list/favorites-list.component";
import {SidebarBoardsComponent} from "@components/sidebar-boards/sidebar-boards.component";
import {SidebarChatComponent} from "@components/sidebar-chat/sidebar-chat.component";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {UnreadBadgeComponent} from "@components/unread-badge/unread-badge.component";
import {ProjectSelectorComponent} from "@components/project-selector/project-selector.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    FavoritesListComponent,
    SidebarBoardsComponent,
    SidebarChatComponent,
    IconComponent,
    TooltipDirective,
    UnreadBadgeComponent,
    ProjectSelectorComponent,
    IconButtonComponent
  ],
  templateUrl: './dashboard-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  @Input() compact = false;
  @Output() closeRequested = new EventEmitter<void>();

  collapsed = false;

  constructor(
    protected settingsService: SettingsService,
    protected teamService: TeamService,
    protected notificationChannelService: NotificationChannelService
  ) {
  }

  get isCollapsed(): boolean {
    return this.collapsed && !this.compact;
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}
