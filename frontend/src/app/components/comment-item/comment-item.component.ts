import {Component, EventEmitter, Input, Output, ViewEncapsulation, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {defaultLanguage} from '@config/translationConfig';
import {Comment} from '@models/comment.model';
import {MenuButtonOption} from '@models/menu-button.model';
import {CommentsErrorCode, ErrorCode} from '@config/errorCodes';
import {CommentService} from '@services/comment.service';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {ButtonComponent} from '@components/button/button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {MenuButtonComponent} from '@components/menu-button/menu-button.component';
import {RichTextEditorComponent} from '@components/rich-text-editor/rich-text-editor.component';
import {MentionContentComponent} from '@components/mention-content/mention-content.component';
import {MentionContext} from '@models/mention.model';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';
import {relativeDate} from '@utils/relativeDate';
import {hasCommentText} from '@utils/commentText';

export type CommentAction = 'edit' | 'delete';

@Component({
  selector: 'app-comment-item',
  imports: [
    NgIf,
    TranslatePipe,
    AvatarComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    MenuButtonComponent,
    RichTextEditorComponent,
    MentionContentComponent,
    TooltipDirective
  ],
  templateUrl: './comment-item.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './comment-item.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CommentItemComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) comment!: Comment;
  @Input({required: true}) teamCode!: string;
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() mentionContext: MentionContext = {};
  @Output() updated = new EventEmitter<Comment>();
  @Output() deleted = new EventEmitter<boolean>();
  @Output() failed = new EventEmitter<ErrorCode>();

  isEditing = false;
  isSaving = false;
  showDeleteConfirm = false;
  draft = '';

  constructor(
    private commentService: CommentService,
    private translateService: TranslateService
  ) {
  }

  get actions(): MenuButtonOption[] {
    const actions: MenuButtonOption[] = [];
    if (this.canEdit) {
      actions.push({value: 'edit', labelKey: PHRASES.EDIT_COMMENT});
    }
    if (this.canDelete) {
      actions.push({value: 'delete', labelKey: PHRASES.DELETE_COMMENT});
    }
    return actions;
  }

  get relativeTime(): string {
    return relativeDate(this.comment.createdAt, this.language);
  }

  get exactTime(): string {
    return new Date(this.comment.createdAt).toLocaleString(this.language);
  }

  get canSave(): boolean {
    return !this.isSaving && hasCommentText(this.draft);
  }

  handleAction(action: string | number | null) {
    if (action === 'edit') {
      this.draft = this.comment.body;
      this.isEditing = true;
    } else if (action === 'delete') {
      this.showDeleteConfirm = true;
    }
  }

  cancelEdit(event?: Event) {
    event?.preventDefault();
    this.isEditing = false;
  }

  async save() {
    if (!this.canSave) {
      return;
    }

    this.isSaving = true;
    const response = await this.commentService.update(this.teamCode, this.comment.id, this.draft);
    this.isSaving = false;

    if (response.success) {
      this.isEditing = false;
      this.updated.emit(response.comment);
    } else {
      this.failed.emit(response.code);
      this.removeIfGone(response.code);
    }
  }

  async confirmDelete() {
    this.showDeleteConfirm = false;
    const response = await this.commentService.delete(this.teamCode, this.comment.id);

    if (response.success) {
      this.deleted.emit(response.commentPinDeleted);
    } else {
      this.failed.emit(response.code);
      this.removeIfGone(response.code);
    }
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  private removeIfGone(code: ErrorCode) {
    if (code === ('COMMENT_NOT_FOUND' satisfies CommentsErrorCode)) {
      this.deleted.emit(false);
    }
  }

  private get language(): string {
    return this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage;
  }
}
