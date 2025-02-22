import {Component} from '@angular/core';
import {DrawerComponent} from "@components/drawer/drawer.component";

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

}
