import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TicketSummary} from '@models/ticket.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';

@Component({
  selector: 'app-backlog-row',
  standalone: true,
  imports: [
    TranslateModule,
    IconButtonComponent,
    FavoriteStarComponent
  ],
  templateUrl: './backlog-row.component.html',
  styleUrl: './backlog-row.component.css'
})
export class BacklogRowComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) ticket!: TicketSummary;
  @Output() opened = new EventEmitter<void>();
  @Output() moveToBoard = new EventEmitter<void>();
  @Output() deleteTicket = new EventEmitter<void>();
}
