import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DashboardHeaderComponent} from "@components/dashboard-header/dashboard-header.component";
import {DashboardSidebarComponent} from "@components/dashboard-sidebar/dashboard-sidebar.component";
import {FavoriteService} from "@services/favorite.service";
import {ProjectFilterService} from "@services/project-filter.service";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterOutlet,
    DashboardHeaderComponent,
    DashboardSidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  constructor(
    private favoriteService: FavoriteService,
    private projectFilterService: ProjectFilterService
  ) {
  }

  ngOnInit() {
    this.favoriteService.load();
    this.projectFilterService.load();
  }
}
