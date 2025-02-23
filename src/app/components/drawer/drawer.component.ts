import {Component, Input, Type} from '@angular/core';
import {NgClass, NgComponentOutlet, NgForOf, NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {TranslationPhrase} from "@config/translationConfig";

export type Drawer = {
  id: number,
  name: string,
  component: Type<any>,
}

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [
    NgForOf,
    TranslateModule,
    NgComponentOutlet,
    NgIf,
    NgClass
  ],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.css'
})

export class DrawerComponent {
  currentOpenDrawerID: number = 0;
  @Input() drawers: Drawer[] = [];
  protected readonly TranslationPhrase = TranslationPhrase;

  handleDrawerClick(drawer: Drawer) {
    this.currentOpenDrawerID = drawer.id;
  }
}
