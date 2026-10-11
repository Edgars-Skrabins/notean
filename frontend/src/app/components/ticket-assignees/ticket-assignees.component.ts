import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {BoardUser} from '@models/board.model';
import {TeamMember} from '@models/team.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-ticket-assignees',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    AvatarComponent,
    IconButtonComponent
  ],
  templateUrl: './ticket-assignees.component.html',
  styleUrl: './ticket-assignees.component.css'
})
export class TicketAssigneesComponent {
  protected readonly PHRASES = PHRASES;

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

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closePicker();
    }
  }

  togglePicker() {
    this.isPickerOpen = !this.isPickerOpen;
    this.searchQuery = '';
  }

  closePicker() {
    this.isPickerOpen = false;
    this.searchQuery = '';
  }

  handlePick(member: TeamMember) {
    this.closePicker();
    this.add.emit(member.id);
  }
}
