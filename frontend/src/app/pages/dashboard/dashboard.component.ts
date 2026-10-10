import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DashboardHeaderComponent} from "@components/dashboard-header/dashboard-header.component";
import {DashboardSidebarComponent} from "@components/dashboard-sidebar/dashboard-sidebar.component";

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
export class DashboardComponent {
}
