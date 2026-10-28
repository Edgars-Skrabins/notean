import {Component, ElementRef, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {MENU_POSITIONS} from '@config/overlayPositions';
import {TicketFilters, TicketStatus} from '@models/ticket.model';
import {TeamMember} from '@models/team.model';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {TagChipComponent} from '@components/tag-chip/tag-chip.component';
import {Tag} from '@models/tag.model';

@Component({
  selector: 'app-ticket-filter',
  imports: [
    NgFor,
    NgIf,
    OverlayModule,
    TranslatePipe,
    CheckboxComponent,
    TagChipComponent
  ],
  templateUrl: './ticket-filter.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ticket-filter.component.css'
})
export class TicketFilterComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly MENU_POSITIONS = MENU_POSITIONS;

  @Input({required: true}) members: TeamMember[] = [];
  @Input({required: true}) statuses: TicketStatus[] = [];
  @Input() tags: Tag[] = [];
  @Input({required: true}) filters!: TicketFilters;
  @Output() filtersChange = new EventEmitter<TicketFilters>();

  isOpen = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  get activeCount(): number {
    return this.filters.assigneeIds.size + this.filters.tagIds.size + this.filters.columnIds.size;
  }

  trackByStatus(_index: number, status: TicketStatus): number | null {
    return status.columnId;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  toggleAssignee(id: number | 'none', checked: boolean) {
    const assigneeIds = new Set(this.filters.assigneeIds);
    if (checked) {
      assigneeIds.add(id);
    } else {
      assigneeIds.delete(id);
    }
    this.emit({...this.filters, assigneeIds});
  }

  toggleTag(id: number | 'none', checked: boolean) {
    const tagIds = new Set(this.filters.tagIds);
    if (checked) {
      tagIds.add(id);
    } else {
      tagIds.delete(id);
    }
    this.emit({...this.filters, tagIds});
  }

  toggleStatus(columnId: number | null, checked: boolean) {
    const columnIds = new Set(this.filters.columnIds);
    if (checked) {
      columnIds.add(columnId);
    } else {
      columnIds.delete(columnId);
    }
    this.emit({...this.filters, columnIds});
  }

  clear() {
    this.emit({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set()});
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.close();
  }

  private emit(filters: TicketFilters) {
    this.filters = filters;
    this.filtersChange.emit(filters);
  }

  private trigger(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.ticketFilter__trigger');
  }
}
