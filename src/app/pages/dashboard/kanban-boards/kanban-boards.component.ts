import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-kanban-boards',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './kanban-boards.component.html',
  styleUrl: './kanban-boards.component.css'
})
export class KanbanBoardsComponent {
  protected readonly PHRASES = PHRASES;
}
