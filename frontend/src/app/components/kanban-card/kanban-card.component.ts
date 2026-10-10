import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {CardSummary} from '@models/card.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [
    TranslateModule,
    IconButtonComponent,
    FavoriteStarComponent
  ],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.css'
})
export class KanbanCardComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) card!: CardSummary;
  @Output() opened = new EventEmitter<void>();
  @Output() deleteCard = new EventEmitter<void>();
}
