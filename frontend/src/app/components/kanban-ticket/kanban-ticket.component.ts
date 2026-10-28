import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TicketSummary} from '@models/ticket.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {FavoriteStarComponent} from '@components/favorite-star/favorite-star.component';
import {AvatarStackComponent} from '@components/avatar-stack/avatar-stack.component';
import {TagChipsComponent} from '@components/tag-chips/tag-chips.component';
import {Tag} from '@models/tag.model';
import {IconComponent} from '@components/icon/icon.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-kanban-ticket',
  imports: [
    NgIf,
    TranslatePipe,
    IconButtonComponent,
    FavoriteStarComponent,
    AvatarStackComponent,
    TagChipsComponent,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './kanban-ticket.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './kanban-ticket.component.css'
})
export class KanbanTicketComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) ticket!: TicketSummary;
  @Input() tags: Tag[] = [];
  @Output() opened = new EventEmitter<void>();
  @Output() moveToBacklog = new EventEmitter<void>();
  @Output() deleteTicket = new EventEmitter<void>();
}
