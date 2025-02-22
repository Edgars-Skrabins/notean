import {Component, Input} from '@angular/core';
import {NgForOf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";

export type Drawer = {
  id: number,
  name: string,
  component: Component,
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
  currentOpenDrawerID: number = 0;
  @Input() drawers: Drawer[] = [];

  handleDrawerClick(drawer: Drawer) {
    this.currentOpenDrawerID = drawer.id;
  }
}
