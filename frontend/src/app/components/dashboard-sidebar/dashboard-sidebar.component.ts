import {Component, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {TeamService} from "@services/team.service";
import {NotificationChannelService} from "@services/notification-channel.service";
import {FavoritesListComponent} from "@components/favorites-list/favorites-list.component";
import {SidebarBoardsComponent} from "@components/sidebar-boards/sidebar-boards.component";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {UnreadBadgeComponent} from "@components/unread-badge/unread-badge.component";
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
    IconComponent,
    TooltipDirective,
    UnreadBadgeComponent
  ],
  templateUrl: './dashboard-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  collapsed = false;

  constructor(
    protected settingsService: SettingsService,
    protected teamService: TeamService,
    protected notificationChannelService: NotificationChannelService
  ) {
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}
