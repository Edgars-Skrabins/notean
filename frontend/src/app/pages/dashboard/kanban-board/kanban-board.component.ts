import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkDragDrop, CdkDropListGroup, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardService} from "@services/board.service";
import {ColumnService} from "@services/column.service";
import {CardService} from "@services/card.service";
import {TeamService} from "@services/team.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardColumn, BoardDetail} from "@models/board.model";
import {CardSummary} from "@models/card.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {KanbanColumnComponent} from "@components/kanban-column/kanban-column.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {FavoriteStarComponent} from "@components/favorite-star/favorite-star.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    IconButtonComponent,
    ButtonComponent,
    KanbanColumnComponent,
    CreateNamedItemDialogComponent,
    ConfirmDialogComponent,
    FavoriteStarComponent,
    CdkDropListGroup
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css'
})
export class KanbanBoardComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  board: BoardDetail | null = null;
  isLoading = true;
  alertMessage = '';
  showDeleteBoardConfirm = false;

  isRenamingBoard = false;
  boardRenameDraft = '';

  columnPendingDeletion: BoardColumn | null = null;
  isCreateColumnDialogOpen = false;

  cardPendingDeletion: { card: CardSummary; column: BoardColumn } | null = null;
  addCardToColumn: BoardColumn | null = null;

  private teamCode: string;
  private boardId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private boardService: BoardService,
    private columnService: ColumnService,
    private cardService: CardService,
    private teamService: TeamService,
    private navigationService: NavigationService,
    private favoriteService: FavoriteService
  ) {
    this.teamCode = this.teamService.getCurrentTeamCode();
  }

  ngOnInit() {
    this.boardId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadBoard();
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS);
  }

  handleDeleteBoard() {
    this.showDeleteBoardConfirm = true;
  }

  handleCancelDeleteBoard() {
    this.showDeleteBoardConfirm = false;
  }

  handleConfirmDeleteBoard() {
    this.showDeleteBoardConfirm = false;

    this.boardService.deleteBoard(this.teamCode, this.boardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.favoriteService.forgetItem('Board', this.boardId);
        this.handleGoBack();
      });
  }

  startRenameBoard() {
    if (!this.board) {
      return;
    }
    this.isRenamingBoard = true;
    this.boardRenameDraft = this.board.title;
  }

  commitRenameBoard() {
    if (!this.isRenamingBoard || !this.board) {
      return;
    }

    const title = this.boardRenameDraft.trim();
    this.isRenamingBoard = false;

    if (!title || title === this.board.title) {
      return;
    }

    this.boardService.renameBoard(this.teamCode, this.boardId, title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        if (this.board) {
          this.board.title = response.board.title;
        }
        this.favoriteService.renameItem('Board', this.boardId, response.board.title);
      });
  }

  cancelRenameBoard() {
    this.isRenamingBoard = false;
  }

  handleRenameColumn(column: BoardColumn, title: string) {
    this.columnService.renameColumn(this.teamCode, this.boardId, column.id, title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        column.title = response.column.title;
      });
  }

  requestDeleteColumn(column: BoardColumn) {
    this.columnPendingDeletion = column;
  }

  handleCancelDeleteColumn() {
    this.columnPendingDeletion = null;
  }

  handleConfirmDeleteColumn() {
    if (!this.columnPendingDeletion || !this.board) {
      return;
    }

    const column = this.columnPendingDeletion;
    this.columnPendingDeletion = null;

    this.columnService.deleteColumn(this.teamCode, this.boardId, column.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        column.cards.forEach((card) => this.favoriteService.forgetItem('Card', card.id));
        if (this.board) {
          this.board.columns = this.board.columns.filter((existing) => existing.id !== column.id);
        }
      });
  }

  handleAddColumn() {
    this.isCreateColumnDialogOpen = true;
  }

  handleCreateColumnConfirmed(event: { title: string }) {
    this.isCreateColumnDialogOpen = false;

    this.columnService.createColumn(this.teamCode, this.boardId, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.board?.columns.push(response.column);
      });
  }

  handleCreateColumnCancelled() {
    this.isCreateColumnDialogOpen = false;
  }

  handleOpenCard(card: CardSummary) {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, this.boardId, AppRoutes.CARDS, card.id]);
  }

  requestDeleteCard(card: CardSummary, column: BoardColumn) {
    this.cardPendingDeletion = {card, column};
  }

  handleCancelDeleteCard() {
    this.cardPendingDeletion = null;
  }

  handleConfirmDeleteCard() {
    if (!this.cardPendingDeletion) {
      return;
    }

    const {card, column} = this.cardPendingDeletion;
    this.cardPendingDeletion = null;

    this.cardService.deleteCard(this.teamCode, this.boardId, card.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.favoriteService.forgetItem('Card', card.id);
        column.cards = column.cards.filter((existing) => existing.id !== card.id);
      });
  }

  handleAddCard(column: BoardColumn) {
    this.addCardToColumn = column;
  }

  handleCreateCardConfirmed(event: { title: string }) {
    const column = this.addCardToColumn;
    this.addCardToColumn = null;

    if (!column) {
      return;
    }

    this.cardService.createCard(this.teamCode, this.boardId, column.id, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        column.cards.push(response.card);
      });
  }

  handleCreateCardCancelled() {
    this.addCardToColumn = null;
  }

  handleCardDropped(event: CdkDragDrop<CardSummary[]>, column: BoardColumn) {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) {
        return;
      }
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }

    const card = event.container.data[event.currentIndex];

    this.cardService.moveCard(this.teamCode, this.boardId, card.id, {columnId: column.id, position: event.currentIndex})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          this.loadBoard();
          return;
        }

        this.alertMessage = '';
      });
  }

  private loadBoard() {
    this.isLoading = true;

    this.boardService.getBoard(this.teamCode, this.boardId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }

        this.alertMessage = '';
        this.board = response.board;
      });
  }
}
