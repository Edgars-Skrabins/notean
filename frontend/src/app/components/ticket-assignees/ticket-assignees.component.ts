import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkConnectedOverlay, OverlayModule} from '@angular/cdk/overlay';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {BoardUser} from '@models/board.model';
import {TeamMember} from '@models/team.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-ticket-assignees',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    OverlayModule,
    TranslateModule,
    AvatarComponent,
    IconButtonComponent
  ],
  templateUrl: './ticket-assignees.component.html',
  styleUrl: './ticket-assignees.component.css'
})
export class TicketAssigneesComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;

  @Input({required: true}) assignees: BoardUser[] = [];
  @Input({required: true}) members: TeamMember[] = [];
  @Input({required: true}) currentUserId!: number;
  @Input() busy = false;
  @Output() add = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  isPickerOpen = false;
  searchQuery = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  get isCurrentUserAssigned(): boolean {
    return this.assignees.some((assignee) => assignee.id === this.currentUserId);
  }

  get availableMembers(): TeamMember[] {
    const assignedIds = new Set(this.assignees.map((assignee) => assignee.id));
    const query = this.searchQuery.trim().toLowerCase();
    return this.members.filter((member) => !assignedIds.has(member.id) && member.nickname.toLowerCase().includes(query));
  }

  togglePicker() {
    this.isPickerOpen = !this.isPickerOpen;
    this.searchQuery = '';
  }

  closePicker() {
    this.isPickerOpen = false;
    this.searchQuery = '';
  }

  focusSearch(overlay: CdkConnectedOverlay) {
    overlay.overlayRef.overlayElement.querySelector<HTMLInputElement>('.ticketAssignees__search')?.focus();
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.closePicker();
  }

  handlePick(member: TeamMember) {
    this.closePicker();
    this.add.emit(member.id);
  }

  private trigger(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.ticketAssignees__trigger');
  }
}
