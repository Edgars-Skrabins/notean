import {Component} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {TeamService} from "@services/team.service";
import {FavoritesListComponent} from "@components/favorites-list/favorites-list.component";
import {SidebarBoardsComponent} from "@components/sidebar-boards/sidebar-boards.component";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    FavoritesListComponent,
    SidebarBoardsComponent,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  collapsed = false;

  constructor(protected settingsService: SettingsService, protected teamService: TeamService) {
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}
