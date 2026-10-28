import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {TemplateService} from '@services/template.service';
import {BoardService} from '@services/board.service';
import {TeamService} from '@services/team.service';
import {EscapeService} from '@services/escape.service';
import {BoardTemplateContent, TemplateDetail} from '@models/template.model';
import {PriorityColor} from '@models/priority.model';
import {TAG_NAME_MAX_LENGTH} from '@models/tag.model';
import {errorPhrase} from '@utils/errorPhrase';
import {templateRoute, templatesRoute} from '@utils/templateRoute';
import {
  boardTemplateFromBoard,
  DEFAULT_BOARD_TEMPLATE_CONTENT,
  parseBoardTemplateContent,
  serializeBoardTemplateContent
} from '@utils/boardTemplateContent';
import {ButtonComponent} from '@components/button/button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {EditConflictDialogComponent} from '@components/edit-conflict-dialog/edit-conflict-dialog.component';
import {TemplateRow, TemplateRowsComponent} from '@components/template-rows/template-rows.component';

const PRIORITY_NAME_MAX_LENGTH = 40;

@Component({
  selector: 'app-board-template-detail',
  imports: [
    NgIf,
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    EditConflictDialogComponent,
    TemplateRowsComponent
  ],
  templateUrl: './board-template-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-template-detail.component.css'
})
export class BoardTemplateDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly PRIORITY_NAME_MAX_LENGTH = PRIORITY_NAME_MAX_LENGTH;
  protected readonly TAG_NAME_MAX_LENGTH = TAG_NAME_MAX_LENGTH;

  template: TemplateDetail | null = null;
  isNew = false;
  isLoading = true;
  isSaving = false;
  title = '';
  columns: TemplateRow[] = [];
  priorities: TemplateRow[] = [];
  tags: TemplateRow[] = [];
  alertMessage = '';
  showDeleteConfirm = false;
  editConflict: TemplateDetail | null = null;

  private readonly teamCode: string;
  private nextKey = 0;
  private unregisterEscape = () => {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private boardService: BoardService,
    teamService: TeamService,
    private escapeService: EscapeService,
    private translateService: TranslateService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get canEdit(): boolean {
    return this.isNew || !!this.template?.canManage;
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleBack());

    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      this.loadTemplate(Number(id));
      return;
    }

    this.isNew = true;
    const boardId = this.route.snapshot.queryParamMap.get('board');
    if (boardId !== null) {
      this.loadBoard(Number(boardId));
      return;
    }

    this.title = this.translateService.instant(PHRASES.UNTITLED_TEMPLATE);
    this.applyContent(DEFAULT_BOARD_TEMPLATE_CONTENT);
    this.isLoading = false;
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleAddColumn() {
    this.columns.push(this.row('', null));
  }

  handleAddPriority() {
    this.priorities.push(this.row('', 'grey'));
  }

  handleAddTag() {
    this.tags.push(this.row('', 'grey'));
  }

  handleCreate() {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.templateService.create(this.teamCode, 'board', this.titleOrUntitled(), this.serializedContent())
      .then((response) => {
        this.isSaving = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.router.navigate(templateRoute('board', response.template.id), {replaceUrl: true});
      });
  }

  handleSave() {
    if (this.template) {
      this.save(this.template.lockVersion);
    }
  }

  handleConflictLoadLatest() {
    if (!this.editConflict) {
      return;
    }

    this.setTemplate(this.editConflict);
    this.editConflict = null;
  }

  handleConflictOverwrite() {
    if (!this.editConflict) {
      return;
    }

    const latest = this.editConflict;
    this.editConflict = null;
    this.save(latest.lockVersion);
  }

  handleConflictCancel() {
    this.editConflict = null;
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;
    if (!this.template) {
      return;
    }

    this.templateService.delete(this.teamCode, this.template.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.handleBack();
      });
  }

  handleBack() {
    this.router.navigate(templatesRoute('board'));
  }

  private save(lockVersion: number) {
    if (!this.template || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.templateService.save(this.teamCode, this.template.id, this.titleOrUntitled(), this.serializedContent(), lockVersion)
      .then((response) => {
        this.isSaving = false;

        if ('latest' in response) {
          this.editConflict = response.latest;
          return;
        }

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.setTemplate(response.template);
      });
  }

  private loadTemplate(id: number) {
    this.templateService.get(this.teamCode, id)
      .then((response) => {
        this.isLoading = false;

        if (!response.success || response.template.kind !== 'board') {
          this.alertMessage = errorPhrase(response.success ? 'TEMPLATE_NOT_FOUND' : response.code);
          return;
        }

        this.setTemplate(response.template);
      });
  }

  private loadBoard(boardId: number) {
    this.boardService.getBoard(this.teamCode, boardId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.title = response.board.title;
        this.applyContent(boardTemplateFromBoard(response.board));
      });
  }

  private setTemplate(template: TemplateDetail) {
    this.template = template;
    this.title = template.title;
    this.applyContent(parseBoardTemplateContent(template.content));
  }

  private applyContent(content: BoardTemplateContent) {
    this.columns = content.columns.map((title) => this.row(title, null));
    this.priorities = content.priorities.map((priority) => this.row(priority.name, priority.color));
    this.tags = content.tags.map((tag) => this.row(tag.name, tag.color));
  }

  private serializedContent(): string {
    return serializeBoardTemplateContent({
      columns: this.columns.map((column) => column.name),
      priorities: this.priorities.map((priority) => ({name: priority.name, color: priority.color ?? 'grey'})),
      tags: this.tags.map((tag) => ({name: tag.name, color: tag.color ?? 'grey'})),
    });
  }

  private titleOrUntitled(): string {
    return this.title.trim() ? this.title : this.translateService.instant(PHRASES.UNTITLED_TEMPLATE);
  }

  private row(name: string, color: PriorityColor | null): TemplateRow {
    return {key: this.nextKey++, name, color};
  }
}
