import {Component} from '@angular/core';
import {NgForOf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";

export type Drawer = {
  id: number,
  name: string,
}

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [
    NgForOf,
    TranslateModule
  ],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css'
})

export class DrawerComponent {
  drawers: Drawer[] = [];

  handleDrawerClick(drawer: Drawer) {

  }
}
