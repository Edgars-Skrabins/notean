import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TicketSummary} from '@models/ticket.model';
import {BoardPriority} from '@models/priority.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';
import {AvatarStackComponent} from '@components/avatar-stack/avatar-stack.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';

@Component({
  selector: 'app-list-row',
  imports: [
    DatePipe,
    NgIf,
    TranslatePipe,
    IconButtonComponent,
    FavoriteStarComponent,
    AvatarStackComponent,
    CheckboxComponent
  ],
  templateUrl: './list-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './list-row.component.css'
})
export class ListRowComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) ticket!: TicketSummary;
  @Input({required: true}) statusTitle = '';
  @Input() priority: BoardPriority | null = null;
  @Input() selected = false;
  @Output() opened = new EventEmitter<void>();
  @Output() selectedChange = new EventEmitter<boolean>();
  @Output() moveToBoard = new EventEmitter<void>();
  @Output() deleteTicket = new EventEmitter<void>();

  handleRowClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.listRow__checkbox, .listRow__assignees, .listRow__actions')) {
      return;
    }

    this.opened.emit();
  }
}
