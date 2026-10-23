import {Component, EventEmitter, Input, Output} from '@angular/core';
import {DatePipe, NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TicketSummary} from '@models/ticket.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';
import {AvatarStackComponent} from '@components/avatar-stack/avatar-stack.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';

@Component({
  selector: 'app-list-row',
  standalone: true,
  imports: [
    DatePipe,
    NgIf,
    TranslateModule,
    IconButtonComponent,
    FavoriteStarComponent,
    AvatarStackComponent,
    CheckboxComponent
  ],
  templateUrl: './list-row.component.html',
  styleUrl: './list-row.component.css'
})
export class ListRowComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) ticket!: TicketSummary;
  @Input({required: true}) statusTitle = '';
  @Input() selected = false;
  @Output() opened = new EventEmitter<void>();
  @Output() selectedChange = new EventEmitter<boolean>();
  @Output() moveToBoard = new EventEmitter<void>();
  @Output() deleteTicket = new EventEmitter<void>();
}
