import {Component} from '@angular/core';
import {DrawerComponent} from "@components/drawer/drawer.component";
import {getSupportedDrawers} from "@pages/dashboard/utils/dashboardDrawers";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DrawerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  protected readonly getSupportedDrawers = getSupportedDrawers;
}
