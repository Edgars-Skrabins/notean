import {Directive, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemService} from "@services/foldered-item.service";
import {EditingService} from "@services/editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {ToastType} from "@models/toast.model";
import {FavoritableType} from "@models/favorite.model";
import {FolderedItemDetail, FolderedItemEditingUser} from "@models/foldered-item.model";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedItemDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected abstract readonly favoriteType: FavoritableType;
  protected abstract readonly listRoute: AppRoutes;
  protected abstract readonly untitledItemPhrase: string;

  item: FolderedItemDetail | null = null;
  mode: 'view' | 'edit' | 'create' = 'view';
  draftTitle = '';
  draftContent = '';
  draftProjectId: number | null = null;
  editingUser: FolderedItemEditingUser | null = null;
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;
  showDiscardConfirm = false;
  isCreating = false;

  private readonly teamCode: string;
  private itemId = 0;
  private folderId: number | null = null;
  private initialDraftProjectId: number | null = null;

  protected constructor(
    private route: ActivatedRoute,
    private itemService: FolderedItemService<ErrorCode>,
    private editingService: EditingService,
    teamService: TeamService,
    private authService: AuthService,
    private navigationService: NavigationService,
    private favoriteService: FavoriteService,
    private toastService: ToastService,
    private projectFilterService: ProjectFilterService,
    private translateService: TranslateService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get otherEditorNickname(): string | null {
    const currentUser = this.authService.getCurrentUser();
    return this.editingUser && this.editingUser.id !== currentUser?.id ? this.editingUser.nickname : null;
  }

  get hasCreateDraftChanges(): boolean {
    return this.draftTitle !== '' || this.draftContent !== '' || this.draftProjectId !== this.initialDraftProjectId;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      if (!params.has('id')) {
        this.startCreate();
        return;
      }

      this.itemId = Number(params.get('id'));
      this.loadItem();
      this.editingService.connect(this.itemId, (editor) => {
        this.editingUser = editor;
      });
    });
  }

  ngOnDestroy() {
    if (this.mode === 'edit') {
      this.editingService.stopEditing();
    }
    this.editingService.disconnect();
  }

  handleEdit() {
    if (!this.item) {
      return;
    }

    this.draftTitle = this.item.title;
    this.draftContent = this.item.content;
    this.mode = 'edit';
    this.editingService.startEditing();
  }

  handleCancel() {
    if (this.mode === 'create') {
      this.requestDiscard();
      return;
    }

    this.mode = 'view';
    this.editingService.stopEditing();
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;

    if (!this.item) {
      return;
    }

    const itemId = this.item.id;

    this.itemService.delete(this.teamCode, itemId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.favoriteService.forgetItem(this.favoriteType, itemId);
        this.handleGoBack();
      });
  }

  handleSave() {
    if (!this.item) {
      return;
    }

    this.itemService.save(this.teamCode, this.item.id, {title: this.draftTitle, content: this.draftContent})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.item = response.item;
        this.favoriteService.renameItem(this.favoriteType, response.item.id, response.item.title);
        this.mode = 'view';
        this.editingService.stopEditing();
      });
  }

  handleCreate() {
    if (this.isCreating) {
      return;
    }

    this.isCreating = true;
    this.itemService.create(this.teamCode, {
      title: this.draftTitle.trim() ? this.draftTitle : this.translateService.instant(this.untitledItemPhrase),
      content: this.draftContent,
      projectId: this.draftProjectId,
      folderId: this.folderId
    })
      .then((response) => {
        this.isCreating = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.handleGoBack();
      });
  }

  handleDraftProjectChange(projectId: number | null) {
    this.draftProjectId = projectId;
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
    this.handleGoBack();
  }

  handleCancelDiscard() {
    this.showDiscardConfirm = false;
  }

  handleProjectChange(projectId: number | null) {
    if (!this.item) {
      return;
    }

    const item = this.item;
    this.itemService.setProject(this.teamCode, item.id, projectId)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.PROJECT_UPDATE_FAILED});
          return;
        }

        item.projectId = response.item.projectId;
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROJECT_UPDATED});
      });
  }

  handleContentChange(content: string) {
    this.draftContent = content;
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, this.listRoute);
  }

  private startCreate() {
    const folder = this.route.snapshot.queryParamMap.get('folder');

    this.mode = 'create';
    this.isLoading = false;
    this.draftTitle = '';
    this.draftContent = '';
    this.draftProjectId = this.projectFilterService.getSelectedProjectId();
    this.initialDraftProjectId = this.draftProjectId;
    this.folderId = folder !== null ? Number(folder) : null;
  }

  private requestDiscard() {
    if (this.hasCreateDraftChanges) {
      this.showDiscardConfirm = true;
      return;
    }

    this.handleGoBack();
  }

  private loadItem() {
    this.isLoading = true;

    this.itemService.get(this.teamCode, this.itemId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.item = response.item;
        this.editingUser = response.item.currentlyEditing;

        const shouldStartInEditMode = this.route.snapshot.queryParamMap.get('edit') === 'true';
        if (shouldStartInEditMode) {
          this.handleEdit();
        }
      });
  }
}
