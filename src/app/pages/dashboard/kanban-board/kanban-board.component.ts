import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardService} from "@services/board.service";
import {ColumnService} from "@services/column.service";
import {TeamService} from "@services/team.service";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardColumn, BoardDetail} from "@models/board.model";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {KanbanColumnComponent} from "@components/kanban-column/kanban-column.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {ConfirmDeleteDialogComponent} from "@components/confirm-delete-dialog/confirm-delete-dialog.component";

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
    ConfirmDeleteDialogComponent
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

  private teamCode: string;
  private boardId = 0;

  constructor(
    private route: ActivatedRoute,
    private boardService: BoardService,
    private columnService: ColumnService,
    private teamService: TeamService,
    private navigationService: NavigationService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
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
          this.alertMessage = response.statusMessage;
          return;
        }

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
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        if (this.board) {
          this.board.title = response.board.title;
        }
      });
  }

  cancelRenameBoard() {
    this.isRenamingBoard = false;
  }

  handleRenameColumn(column: BoardColumn, title: string) {
    this.columnService.renameColumn(this.teamCode, this.boardId, column.id, title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
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
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
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
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.board?.columns.push(response.column);
      });
  }

  handleCreateColumnCancelled() {
    this.isCreateColumnDialogOpen = false;
  }

  private loadBoard() {
    this.isLoading = true;

    this.boardService.getBoard(this.teamCode, this.boardId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.board = response.board;
      });
  }
}
