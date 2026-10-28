import {Component, ElementRef, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TagService} from '@services/tag.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {PriorityColor} from '@models/priority.model';
import {Tag, TAG_NAME_MAX_LENGTH, TagsResponse} from '@models/tag.model';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {PriorityColorPickerComponent} from '@components/priority-color-picker/priority-color-picker.component';
import {TagChipComponent} from '@components/tag-chip/tag-chip.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';
import {errorPhrase} from '@utils/errorPhrase';
import {nextTagColor, sortTags} from '@utils/tagOrder';
import {BoardPageStateService} from '@pages/dashboard/board-page/board-page-state.service';

@Component({
  selector: 'app-tag-list',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslatePipe,
    IconComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    PriorityColorPickerComponent,
    TagChipComponent,
    TooltipDirective
  ],
  templateUrl: './tag-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tag-list.component.css'
})
export class TagListComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly TAG_NAME_MAX_LENGTH = TAG_NAME_MAX_LENGTH;

  editingId: number | null = null;
  nameDraft = '';
  isCreating = false;
  newName = '';
  newColor: PriorityColor = 'grey';
  pendingDeletion: Tag | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private state: BoardPageStateService,
    private tagService: TagService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) {
  }

  get tags(): Tag[] {
    return this.state.board?.tags ?? [];
  }

  get deleteMessage(): string {
    const tag = this.pendingDeletion;
    if (!tag) {
      return '';
    }
    const count = this.ticketCount(tag);
    if (!count) {
      return this.translateService.instant(PHRASES.CONFIRM_DELETE_UNUSED_TAG, {name: tag.name});
    }
    if (count === 1) {
      return this.translateService.instant(PHRASES.CONFIRM_DELETE_TAG_ONE, {name: tag.name});
    }
    return this.translateService.instant(PHRASES.CONFIRM_DELETE_TAG, {name: tag.name, count});
  }

  trackById(_index: number, tag: Tag): number {
    return tag.id;
  }

  ticketCount(tag: Tag): number {
    return this.state.ticketsByStatus()
      .flatMap((group) => group.tickets)
      .filter((ticket) => ticket.tagIds.includes(tag.id))
      .length;
  }

  startRename(tag: Tag) {
    this.editingId = tag.id;
    this.nameDraft = tag.name;
    this.focusInput('.tagList__nameInput');
  }

  cancelRename() {
    this.editingId = null;
    this.nameDraft = '';
  }

  commitRename(tag: Tag) {
    if (this.editingId !== tag.id) {
      return;
    }
    const name = this.nameDraft.trim();
    this.cancelRename();
    if (!name || name === tag.name) {
      return;
    }

    this.applyTags(this.tagService.update(this.state.teamCode, this.state.boardId, tag.id, {name}));
  }

  changeColor(tag: Tag, color: PriorityColor) {
    this.applyTags(this.tagService.update(this.state.teamCode, this.state.boardId, tag.id, {color}));
  }

  startCreate() {
    this.isCreating = true;
    this.newName = '';
    this.newColor = nextTagColor(this.tags);
    this.focusInput('.tagList__newInput');
  }

  cancelCreate() {
    this.isCreating = false;
    this.newName = '';
  }

  commitCreate() {
    if (!this.isCreating) {
      return;
    }
    const name = this.newName.trim();
    const color = this.newColor;
    this.cancelCreate();
    if (!name) {
      return;
    }

    this.tagService.create(this.state.teamCode, this.state.boardId, name, color)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }
        this.state.setTags(sortTags([...this.tags.filter((tag) => tag.id !== response.tag.id), response.tag]));
      });
  }

  requestDelete(tag: Tag) {
    this.pendingDeletion = tag;
  }

  handleCancelDelete() {
    this.pendingDeletion = null;
  }

  handleConfirmDelete() {
    const tag = this.pendingDeletion;
    this.pendingDeletion = null;
    if (!tag) {
      return;
    }

    this.applyTags(this.tagService.remove(this.state.teamCode, this.state.boardId, tag.id));
  }

  private applyTags(request: Promise<TagsResponse>) {
    request.then((response) => {
      if (!response.success) {
        this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
        return;
      }
      this.state.setTags(response.tags);
    });
  }

  private focusInput(selector: string) {
    setTimeout(() => {
      const input = this.elementRef.nativeElement.querySelector<HTMLInputElement>(selector);
      input?.focus();
      input?.select();
    });
  }
}
