import {Component, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {PriorityListComponent} from "@components/priority-list/priority-list.component";
import {TagListComponent} from "@components/tag-list/tag-list.component";

@Component({
  selector: 'app-board-settings-tab',
  imports: [
    TranslatePipe,
    PriorityListComponent,
    TagListComponent
  ],
  templateUrl: './board-settings-tab.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-settings-tab.component.css'
})
export class BoardSettingsTabComponent {
  protected readonly PHRASES = PHRASES;
}
