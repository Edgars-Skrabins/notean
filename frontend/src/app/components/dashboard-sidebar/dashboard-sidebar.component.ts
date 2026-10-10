import {Component} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {FavoritesListComponent} from "@components/favorites-list/favorites-list.component";
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
    FavoritesListComponent
  ],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.css'
})
export class DashboardSidebarComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  collapsed = false;

  constructor(protected settingsService: SettingsService) {
  }

  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}
