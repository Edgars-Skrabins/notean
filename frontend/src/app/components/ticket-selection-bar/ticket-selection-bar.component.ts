import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TicketStatus} from '@models/ticket.model';
import {BoardUser} from '@models/board.model';
import {TeamMember} from '@models/team.model';
import {MenuButtonOption} from '@models/menu-button.model';
import {MenuButtonComponent} from '@components/menu-button/menu-button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-ticket-selection-bar',
  imports: [
    TranslateModule,
    MenuButtonComponent,
    IconButtonComponent
  ],
  templateUrl: './ticket-selection-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ticket-selection-bar.component.css'
})
export class TicketSelectionBarComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) count = 0;
  @Input({required: true}) statuses: TicketStatus[] = [];
  @Input({required: true}) members: TeamMember[] = [];
  @Input({required: true}) assignedMembers: BoardUser[] = [];
  @Input() busy = false;
  @Output() setStatus = new EventEmitter<number | null>();
  @Output() assign = new EventEmitter<number>();
  @Output() unassign = new EventEmitter<number>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();

  get statusOptions(): MenuButtonOption[] {
    return this.statuses.map((status) => status.columnId === null
      ? {value: null, labelKey: status.title}
      : {value: status.columnId, label: status.title});
  }

  get memberOptions(): MenuButtonOption[] {
    return this.members.map((member) => ({value: member.id, label: member.nickname, avatar: member.avatar}));
  }

  get assignedOptions(): MenuButtonOption[] {
    return this.assignedMembers.map((member) => ({value: member.id, label: member.nickname, avatar: member.avatar}));
  }

  handleSetStatus(value: string | number | null) {
    this.setStatus.emit(value === null ? null : Number(value));
  }

  handleAssign(value: string | number | null) {
    this.assign.emit(Number(value));
  }

  handleUnassign(value: string | number | null) {
    this.unassign.emit(Number(value));
  }
}
