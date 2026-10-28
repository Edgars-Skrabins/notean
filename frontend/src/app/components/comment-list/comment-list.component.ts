import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ErrorCode} from '@config/errorCodes';
import {Comment, CommentTarget} from '@models/comment.model';
import {AuthService} from '@services/auth.service';
import {CommentService} from '@services/comment.service';
import {TeamService} from '@services/team.service';
import {ButtonComponent} from '@components/button/button.component';
import {CommentItemComponent} from '@components/comment-item/comment-item.component';
import {LoadMoreComponent} from '@components/load-more/load-more.component';
import {RichTextEditorComponent} from '@components/rich-text-editor/rich-text-editor.component';
import {errorPhrase} from '@utils/errorPhrase';
import {hasCommentText} from '@utils/commentText';
import {MentionContext} from '@models/mention.model';

const MANAGER_ROLES = ['admin', 'owner'];

@Component({
  selector: 'app-comment-list',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    CommentItemComponent,
    LoadMoreComponent,
    RichTextEditorComponent
  ],
  templateUrl: './comment-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './comment-list.component.css'
})
export class CommentListComponent implements OnChanges {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) target!: CommentTarget;
  @Input() title: string | null = PHRASES.COMMENTS;
  @Input() submitLabel: string = PHRASES.POST_COMMENT;
  @Input() mentionContext: MentionContext = {};
  @Output() commentAdded = new EventEmitter<Comment>();
  @Output() commentUpdated = new EventEmitter<Comment>();
  @Output() commentRemoved = new EventEmitter<Comment>();
  @Output() emptied = new EventEmitter<void>();
  @Output() loaded = new EventEmitter<void>();

  comments: Comment[] = [];
  hasMore = false;
  isLoaded = false;
  isLoadingMore = false;
  isPosting = false;
  draft = '';
  alertMessage = '';

  readonly teamCode: string;
  private readonly currentUserId: number;
  private readonly isManager: boolean;

  constructor(
    private commentService: CommentService,
    authService: AuthService,
    teamService: TeamService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
    this.currentUserId = authService.getCurrentUser()?.id ?? 0;
    this.isManager = MANAGER_ROLES.includes(teamService.getCurrentRole() ?? '');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['target']) {
      this.comments = [];
      this.isLoaded = false;
      this.load();
    }
  }

  get canPost(): boolean {
    return !this.isPosting && hasCommentText(this.draft);
  }

  trackById(_index: number, comment: Comment): number {
    return comment.id;
  }

  canEdit(comment: Comment): boolean {
    return comment.author.id === this.currentUserId;
  }

  canDelete(comment: Comment): boolean {
    return this.canEdit(comment) || this.isManager;
  }

  async loadMore() {
    if (this.isLoadingMore || this.comments.length === 0) {
      return;
    }

    this.isLoadingMore = true;
    const response = await this.commentService.list(this.teamCode, this.target, this.comments[0].id);
    this.isLoadingMore = false;

    if (response.success) {
      this.comments = [...response.comments.reverse(), ...this.comments];
      this.hasMore = response.hasMore;
    } else {
      this.showError(response.code);
    }
  }

  async post() {
    if (!this.canPost) {
      return;
    }

    this.isPosting = true;
    const response = await this.commentService.create(this.teamCode, this.target, this.draft);
    this.isPosting = false;

    if (response.success) {
      this.comments = [...this.comments, response.comment];
      this.draft = '';
      this.alertMessage = '';
      this.commentAdded.emit(response.comment);
    } else {
      this.showError(response.code);
    }
  }

  handleUpdated(comment: Comment) {
    this.comments = this.comments.map((item) => item.id === comment.id ? comment : item);
    this.alertMessage = '';
    this.commentUpdated.emit(comment);
  }

  handleDeleted(comment: Comment, pinDeleted: boolean) {
    this.comments = this.comments.filter((item) => item.id !== comment.id);
    this.commentRemoved.emit(comment);
    if (pinDeleted) {
      this.emptied.emit();
    }
  }

  showError(code: ErrorCode) {
    this.alertMessage = errorPhrase(code);
  }

  private async load() {
    const target = this.target;
    const response = await this.commentService.list(this.teamCode, target);
    if (target !== this.target) {
      return;
    }

    this.isLoaded = true;
    if (response.success) {
      this.comments = response.comments.reverse();
      this.hasMore = response.hasMore;
    } else {
      this.showError(response.code);
    }
    this.loaded.emit();
  }
}
