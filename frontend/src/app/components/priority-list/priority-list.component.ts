import {Component, ElementRef} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {TranslateModule, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {PriorityService} from '@services/priority.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {BoardPriority, PrioritiesResponse, PriorityColor} from '@models/priority.model';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {PriorityColorPickerComponent} from '@components/priority-color-picker/priority-color-picker.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';
import {errorPhrase} from '@utils/errorPhrase';
import {BoardPageStateService} from '@pages/dashboard/board-page/board-page-state.service';

@Component({
  selector: 'app-priority-list',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TranslateModule,
    IconComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    PriorityColorPickerComponent,
    TooltipDirective
  ],
  templateUrl: './priority-list.component.html',
  styleUrl: './priority-list.component.css'
})
export class PriorityListComponent {
  protected readonly PHRASES = PHRASES;

  editingId: number | null = null;
  nameDraft = '';
  pendingDeletion: BoardPriority | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private state: BoardPageStateService,
    private priorityService: PriorityService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) {
  }

  get priorities(): BoardPriority[] {
    return this.state.board?.priorities ?? [];
  }

  get deleteMessage(): string {
    const priority = this.pendingDeletion;
    if (!priority) {
      return '';
    }
    const count = this.ticketCount(priority);
    if (!count) {
      return this.translateService.instant(PHRASES.CONFIRM_DELETE_UNUSED_PRIORITY, {name: priority.name});
    }
    if (count === 1) {
      return this.translateService.instant(PHRASES.CONFIRM_DELETE_PRIORITY_ONE, {name: priority.name});
    }
    return this.translateService.instant(PHRASES.CONFIRM_DELETE_PRIORITY, {name: priority.name, count});
  }

  trackById(_index: number, priority: BoardPriority): number {
    return priority.id;
  }

  ticketCount(priority: BoardPriority): number {
    return this.state.ticketsByStatus()
      .flatMap((group) => group.tickets)
      .filter((ticket) => ticket.priorityId === priority.id)
      .length;
  }

  startRename(priority: BoardPriority) {
    this.editingId = priority.id;
    this.nameDraft = priority.name;
    this.focusNameInput();
  }

  cancelRename() {
    this.editingId = null;
    this.nameDraft = '';
  }

  commitRename(priority: BoardPriority) {
    if (this.editingId !== priority.id) {
      return;
    }
    const name = this.nameDraft.trim();
    this.cancelRename();
    if (!name || name === priority.name) {
      return;
    }

    this.applyPriorities(this.priorityService.update(this.state.teamCode, this.state.boardId, priority.id, {name}));
  }

  changeColor(priority: BoardPriority, color: PriorityColor) {
    this.applyPriorities(this.priorityService.update(this.state.teamCode, this.state.boardId, priority.id, {color}));
  }

  handleDropped(event: CdkDragDrop<BoardPriority[]>) {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const priorities = this.priorities;
    const priority = priorities[event.previousIndex];
    moveItemInArray(priorities, event.previousIndex, event.currentIndex);

    this.priorityService.update(this.state.teamCode, this.state.boardId, priority.id, {position: event.currentIndex})
      .then((response) => {
        if (!response.success) {
          moveItemInArray(priorities, event.currentIndex, event.previousIndex);
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }
        this.state.setPriorities(response.priorities);
      });
  }

  handleAdd() {
    const name = this.uniqueName(this.translateService.instant(PHRASES.NEW_PRIORITY));
    this.priorityService.create(this.state.teamCode, this.state.boardId, name, 'grey')
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }
        this.state.setPriorities([...this.priorities, response.priority]);
        this.startRename(response.priority);
      });
  }

  requestDelete(priority: BoardPriority) {
    this.pendingDeletion = priority;
  }

  handleCancelDelete() {
    this.pendingDeletion = null;
  }

  handleConfirmDelete() {
    const priority = this.pendingDeletion;
    this.pendingDeletion = null;
    if (!priority) {
      return;
    }

    this.applyPriorities(this.priorityService.delete(this.state.teamCode, this.state.boardId, priority.id));
  }

  private applyPriorities(request: Promise<PrioritiesResponse>) {
    request.then((response) => {
      if (!response.success) {
        this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
        return;
      }
      this.state.setPriorities(response.priorities);
    });
  }

  private uniqueName(base: string): string {
    const taken = new Set(this.priorities.map((priority) => priority.name.toLowerCase()));
    let name = base;
    for (let suffix = 2; taken.has(name.toLowerCase()); suffix++) {
      name = `${base} ${suffix}`;
    }
    return name;
  }

  private focusNameInput() {
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector<HTMLInputElement>('.priorityList__nameInput');
      input?.focus();
      input?.select();
    });
  }
}
