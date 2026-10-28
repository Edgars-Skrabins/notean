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
import {TrashService} from "@services/trash.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {FolderService} from "@services/folder.service";
import {CopyLinkService} from "@services/copy-link.service";
import {ToastType} from "@models/toast.model";
import {FavoritableType} from "@models/favorite.model";
import {FolderItemType} from "@models/folder.model";
import {CreateFolderedItemParams, FolderedItemDetail, FolderedItemEditingUser} from "@models/foldered-item.model";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedItemDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected abstract readonly favoriteType: FavoritableType;
  protected abstract readonly itemType: FolderItemType;
  protected abstract readonly listRoute: AppRoutes;
  protected abstract readonly untitledItemPhrase: string;
  protected abstract readonly notFoundCode: ErrorCode;

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
  editConflict: FolderedItemDetail | null = null;
  isCreating = false;

  protected readonly teamCode: string;
  protected isCreated = false;
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
    protected toastService: ToastService,
    private projectFilterService: ProjectFilterService,
    private folderService: FolderService,
    private translateService: TranslateService,
    private copyLinkService: CopyLinkService,
    private trashService: TrashService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get isProjectSetByFolder(): boolean {
    return this.mode === 'create' ? this.folderId !== null : this.item?.folderId != null;
  }

  get otherEditorNickname(): string | null {
    const currentUser = this.authService.getCurrentUser();
    return this.editingUser && this.editingUser.id !== currentUser?.id ? this.editingUser.nickname : null;
  }

  get hasCreateDraftChanges(): boolean {
    return this.draftTitle !== '' || this.draftContent !== '' || this.draftProjectId !== this.initialDraftProjectId;
  }

  get hasEditChanges(): boolean {
    return !!this.item && (this.draftTitle !== this.item.title || this.draftContent !== this.item.content);
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

    this.leaveEditMode();
  }

  handleEscape() {
    if (this.mode === 'edit' && this.hasEditChanges) {
      this.showDiscardConfirm = true;
      return;
    }

    if (this.mode === 'view') {
      this.handleClose();
      return;
    }

    this.handleCancel();
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCopyLink() {
    this.copyLinkService.copyCurrentLink();
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
        this.trashService.notifyTrashed(this.teamCode, response.trashEntryIds);
        this.handleGoBack();
      });
  }

  handleSave() {
    if (!this.item) {
      return;
    }

    this.saveDraft(this.item.id, this.item.lockVersion);
  }

  handleConflictLoadLatest() {
    if (!this.editConflict) {
      return;
    }

    this.item = this.editConflict;
    this.editConflict = null;
    this.favoriteService.renameItem(this.favoriteType, this.item.id, this.item.title);
    this.leaveEditMode();
  }

  handleConflictOverwrite() {
    if (!this.editConflict) {
      return;
    }

    const latest = this.editConflict;
    this.editConflict = null;
    this.saveDraft(latest.id, latest.lockVersion);
  }

  handleConflictCancel() {
    this.editConflict = null;
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
      folderId: this.folderId,
      ...this.createExtras()
    })
      .then((response) => {
        this.isCreating = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.isCreated = true;
        const {id, title, folderId, projectId, lockVersion, creator, createdAt, updatedAt} = response.item;
        const createdItem = {id, title, folderId, projectId, lockVersion, creator, createdAt, updatedAt};
        this.navigationService.navigateWithState({createdItem}, AppRoutes.DASHBOARD, this.listRoute);
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

    if (this.mode === 'edit') {
      this.leaveEditMode();
      return;
    }

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
        item.lockVersion = response.item.lockVersion;
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROJECT_UPDATED});
      });
  }

  handleContentChange(content: string) {
    this.draftContent = content;
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, this.listRoute);
  }

  protected createExtras(): Partial<CreateFolderedItemParams> {
    return {};
  }

  protected afterEditEnded() {
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

    if (this.folderId !== null) {
      this.loadFolderProject(this.folderId);
    }
  }

  private loadFolderProject(folderId: number) {
    this.folderService.listFolders(this.teamCode, this.itemType)
      .then((response) => {
        const folder = response.success ? response.folders.find((candidate) => candidate.id === folderId) : undefined;
        if (!folder) {
          return;
        }

        this.draftProjectId = folder.projectId;
        this.initialDraftProjectId = folder.projectId;
      });
  }

  private saveDraft(id: number, lockVersion: number) {
    this.itemService.save(this.teamCode, id, {title: this.draftTitle, content: this.draftContent, lockVersion})
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
        this.item = response.item;
        this.favoriteService.renameItem(this.favoriteType, response.item.id, response.item.title);
        this.mode = 'view';
        this.editingService.stopEditing();
        this.afterEditEnded();
      });
  }

  private leaveEditMode() {
    this.mode = 'view';
    this.editingService.stopEditing();
    this.afterEditEnded();
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
          if (response.code === this.notFoundCode) {
            this.navigationService.navigateReplacingUrl(AppRoutes.UNAVAILABLE);
            return;
          }
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
