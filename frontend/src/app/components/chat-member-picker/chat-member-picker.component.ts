import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {BoardUser} from '@models/board.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';

@Component({
  selector: 'app-chat-member-picker',
  imports: [
    NgFor,
    TranslatePipe,
    AvatarComponent,
    CheckboxComponent
  ],
  templateUrl: './chat-member-picker.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-member-picker.component.css'
})
export class ChatMemberPickerComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) members: BoardUser[] = [];
  @Input() selectedIds: number[] = [];
  @Input() lockedIds: number[] = [];
  @Output() selectedIdsChange = new EventEmitter<number[]>();

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id) || this.lockedIds.includes(id);
  }

  handleToggle(id: number, checked: boolean) {
    this.selectedIdsChange.emit(checked ? [...this.selectedIds.filter((existing) => existing !== id), id] : this.selectedIds.filter((existing) => existing !== id));
  }
}
