import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {Subscription} from 'rxjs';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {TITLE_MAX_LENGTH} from "@config/contentLimits";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {FavoriteService} from "@services/favorite.service";
import {NavigationService} from "@services/navigation.service";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {ProjectSelectComponent} from "@components/project-select/project-select.component";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "./board-page-state.service";
import {BoardChannelService} from "@services/board-channel.service";

@Component({
  selector: 'app-board-page',
  imports: [
    FormsModule,
    NgIf,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
    IconButtonComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent,
    ProjectSelectComponent
  ],
  providers: [BoardPageStateService, BoardChannelService],
  templateUrl: './board-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-page.component.css'
})
export class BoardPageComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly AppRoutes = AppRoutes;

  isRenaming = false;
  renameDraft = '';
  showDeleteConfirm = false;
  alertMessage = '';

  private paramSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    protected state: BoardPageStateService,
    private boardService: BoardService,
    private boardListService: BoardListService,
    private favoriteService: FavoriteService,
    private navigationService: NavigationService,
    private toastService: ToastService,
    private boardChannelService: BoardChannelService
  ) {
  }

  ngOnInit() {
    this.paramSubscription = this.route.paramMap.subscribe((params) => {
      this.isRenaming = false;
      this.alertMessage = '';
      this.boardChannelService.disconnect();
      this.state.load(Number(params.get('id'))).then(() => {
        this.alertMessage = this.state.errorCode ? errorPhrase(this.state.errorCode) : '';
        if (this.state.board) {
          this.boardChannelService.connect(this.state.board.id);
        }
      });
    });
  }

  ngOnDestroy() {
    this.paramSubscription?.unsubscribe();
    this.boardChannelService.disconnect();
  }

  startRename() {
    if (!this.state.board) {
      return;
    }
    this.isRenaming = true;
    this.renameDraft = this.state.board.title;
  }

  commitRename() {
    const board = this.state.board;
    if (!this.isRenaming || !board) {
      return;
    }

    const title = this.renameDraft.trim();
    this.isRenaming = false;

    if (!title || title === board.title) {
      return;
    }

    this.boardService.renameBoard(this.state.teamCode, board.id, title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        board.title = response.board.title;
        this.boardListService.rename(board.id, board.title);
        this.favoriteService.renameItem('Board', board.id, board.title);
      });
  }

  cancelRename() {
    this.isRenaming = false;
  }

  handleProjectChange(projectId: number | null) {
    const board = this.state.board;
    if (!board) {
      return;
    }

    this.boardService.setBoardProject(this.state.teamCode, board.id, projectId)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: PHRASES.PROJECT_UPDATE_FAILED});
          return;
        }

        board.projectId = response.board.projectId;
        this.boardListService.load();
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROJECT_UPDATED});
      });
  }

  handleDelete() {
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;
    const boardId = this.state.boardId;
    this.boardChannelService.disconnect();

    this.boardService.deleteBoard(this.state.teamCode, boardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          this.boardChannelService.connect(boardId);
          return;
        }

        this.boardListService.remove(boardId);
        this.favoriteService.forgetItem('Board', boardId);
        this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
      });
  }
}
