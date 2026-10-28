import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TemplateService, builtInTemplate} from '@services/template.service';
import {TeamService} from '@services/team.service';
import {BUILT_IN_TEMPLATE_PREFIX, BuiltInTemplate, TemplateDetail, TemplateKind} from '@models/template.model';
import {FolderedItemDetail} from '@models/foldered-item.model';
import {errorPhrase} from '@utils/errorPhrase';
import {createFromTemplateRoute, templateRoute, templatesRoute} from '@utils/templateRoute';
import {ButtonComponent} from '@components/button/button.component';
import {RichTextEditorComponent} from '@components/rich-text-editor/rich-text-editor.component';
import {FlowchartEditorComponent} from '@components/flowchart-editor/flowchart-editor.component';
import {ItemDetailLayoutComponent} from '@components/item-detail-layout/item-detail-layout.component';

type ItemTemplateKind = Exclude<TemplateKind, 'board'>;

export function templateAsItem(template: TemplateDetail | BuiltInTemplate): FolderedItemDetail {
  const builtIn = !('id' in template);
  return {
    id: builtIn ? 0 : template.id,
    title: template.title,
    content: template.content,
    folderId: null,
    projectId: null,
    lockVersion: builtIn ? 0 : template.lockVersion,
    creator: builtIn ? {id: 0, nickname: '', avatar: {color: 'blue', imageUrl: null}} : template.creator,
    createdAt: builtIn ? '' : template.createdAt,
    updatedAt: builtIn ? '' : template.updatedAt,
    contributors: [],
    attachments: [],
    currentlyEditing: null,
  };
}

@Component({
  selector: 'app-template-detail',
  imports: [
    NgIf,
    TranslatePipe,
    ButtonComponent,
    RichTextEditorComponent,
    FlowchartEditorComponent,
    ItemDetailLayoutComponent
  ],
  templateUrl: './template-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './template-detail.component.css'
})
export class TemplateDetailComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  readonly kind: ItemTemplateKind;
  template: TemplateDetail | null = null;
  builtIn: BuiltInTemplate | null = null;
  mode: 'view' | 'edit' | 'create' = 'view';
  draftTitle = '';
  draftContent = '';
  alertMessage = '';
  showDeleteConfirm = false;
  showDiscardConfirm = false;
  editConflict: TemplateDetail | null = null;
  isSaving = false;

  private readonly teamCode: string;
  private layoutSource: TemplateDetail | BuiltInTemplate | null = null;
  private cachedLayoutItem: FolderedItemDetail | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    teamService: TeamService,
    private translateService: TranslateService
  ) {
    this.kind = route.snapshot.data['kind'];
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get layoutItem(): FolderedItemDetail | null {
    const template = this.template ?? this.builtIn;
    if (template !== this.layoutSource) {
      this.layoutSource = template;
      this.cachedLayoutItem = template ? templateAsItem(template) : null;
    }
    return this.cachedLayoutItem;
  }

  get canManage(): boolean {
    return !!this.template?.canManage;
  }

  get content(): string {
    return (this.template ?? this.builtIn)?.content ?? '';
  }

  get hasCreateDraftChanges(): boolean {
    return this.draftTitle !== '' || this.draftContent !== '';
  }

  get hasEditChanges(): boolean {
    return !!this.template && (this.draftTitle !== this.template.title || this.draftContent !== this.template.content);
  }

  ngOnInit() {
    const params = this.route.snapshot.paramMap;
    if (params.has('key')) {
      this.builtIn = builtInTemplate(this.kind, params.get('key')!) ?? null;
      if (!this.builtIn) {
        this.handleGoBack();
      }
      return;
    }

    if (!params.has('id')) {
      this.mode = 'create';
      return;
    }

    this.templateService.get(this.teamCode, Number(params.get('id')))
      .then((response) => {
        if (!response.success || response.template.kind !== this.kind) {
          this.alertMessage = errorPhrase(response.success ? 'TEMPLATE_NOT_FOUND' : response.code);
          return;
        }

        this.template = response.template;
      });
  }

  handleEdit() {
    if (!this.template) {
      return;
    }

    this.draftTitle = this.template.title;
    this.draftContent = this.template.content;
    this.mode = 'edit';
  }

  handleContentChange(content: string) {
    this.draftContent = content;
  }

  handleCancel() {
    if (this.mode === 'create') {
      this.requestDiscard();
      return;
    }

    this.mode = 'view';
  }

  handleEscape() {
    if (this.mode === 'edit' && this.hasEditChanges) {
      this.showDiscardConfirm = true;
      return;
    }

    if (this.mode === 'view') {
      this.handleGoBack();
      return;
    }

    this.handleCancel();
  }

  handleClose() {
    if (this.mode === 'create') {
      this.requestDiscard();
      return;
    }

    this.handleGoBack();
  }

  handleConfirmDiscard() {
    this.showDiscardConfirm = false;

    if (this.mode === 'edit') {
      this.mode = 'view';
      return;
    }

    this.handleGoBack();
  }

  handleCancelDiscard() {
    this.showDiscardConfirm = false;
  }

  handleCreate() {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.templateService.create(this.teamCode, this.kind, this.titleOrUntitled(), this.draftContent)
      .then((response) => {
        this.isSaving = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.handleGoBack();
      });
  }

  handleSave() {
    if (this.template) {
      this.saveDraft(this.template.lockVersion);
    }
  }

  handleConflictLoadLatest() {
    if (!this.editConflict) {
      return;
    }

    this.template = this.editConflict;
    this.editConflict = null;
    this.mode = 'view';
  }

  handleConflictOverwrite() {
    if (!this.editConflict) {
      return;
    }

    const latest = this.editConflict;
    this.editConflict = null;
    this.saveDraft(latest.lockVersion);
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

        this.handleGoBack();
      });
  }

  handleUse() {
    const ref = this.builtIn ? `${BUILT_IN_TEMPLATE_PREFIX}${this.builtIn.key}` : String(this.template?.id);
    const {commands, queryParams} = createFromTemplateRoute(this.kind, ref);
    this.router.navigate(commands, {queryParams});
  }

  handleDuplicate() {
    if (!this.builtIn || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.templateService.create(this.teamCode, this.kind, this.builtIn.title, this.builtIn.content)
      .then((response) => {
        this.isSaving = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.router.navigate(templateRoute(this.kind, response.template.id));
      });
  }

  handleGoBack() {
    this.router.navigate(templatesRoute(this.kind));
  }

  private saveDraft(lockVersion: number) {
    if (!this.template) {
      return;
    }

    this.templateService.save(this.teamCode, this.template.id, this.titleOrUntitled(), this.draftContent, lockVersion)
      .then((response) => {
        if ('latest' in response) {
          this.editConflict = response.latest;
          return;
        }

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.template = response.template;
        this.mode = 'view';
      });
  }

  private titleOrUntitled(): string {
    return this.draftTitle.trim() ? this.draftTitle : this.translateService.instant(PHRASES.UNTITLED_TEMPLATE);
  }

  private requestDiscard() {
    if (this.hasCreateDraftChanges) {
      this.showDiscardConfirm = true;
      return;
    }

    this.handleGoBack();
  }
}
