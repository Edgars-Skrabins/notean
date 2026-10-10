import {Directive, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {PHRASES} from "@config/phrases";
import {ErrorCode} from "@config/errorCodes";
import {FolderedItemService} from "@services/foldered-item.service";
import {EditingService} from "@services/editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {FavoritableType} from "@models/favorite.model";
import {FolderedItemDetail, FolderedItemEditingUser} from "@models/foldered-item.model";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../app/app-routes.enum";

@Directive()
export abstract class FolderedItemDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected abstract readonly favoriteType: FavoritableType;
  protected abstract readonly listRoute: AppRoutes;

  item: FolderedItemDetail | null = null;
  mode: 'view' | 'edit' = 'view';
  draftTitle = '';
  draftContent = '';
  editingUser: FolderedItemEditingUser | null = null;
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;

  private readonly teamCode: string;
  private itemId = 0;

  protected constructor(
    private route: ActivatedRoute,
    private itemService: FolderedItemService<ErrorCode>,
    private editingService: EditingService,
    teamService: TeamService,
    private authService: AuthService,
    private navigationService: NavigationService,
    private favoriteService: FavoriteService
  ) {
    this.teamCode = teamService.getCurrentTeamCode();
  }

  get otherEditorNickname(): string | null {
    const currentUser = this.authService.getCurrentUser();
    return this.editingUser && this.editingUser.id !== currentUser?.id ? this.editingUser.nickname : null;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
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

  handleContentChange(content: string) {
    this.draftContent = content;
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, this.listRoute);
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
