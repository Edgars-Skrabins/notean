import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardService} from "@services/board.service";
import {TeamService} from "@services/team.service";
import {BoardSummary} from "@models/board.model";
import {AppRoutes} from "../../../app/app-routes.enum";
import {ButtonComponent} from "@components/button/button.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {ConfirmDeleteDialogComponent} from "@components/confirm-delete-dialog/confirm-delete-dialog.component";

@Component({
  selector: 'app-kanban-section',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    DatePipe,
    TranslateModule,
    ButtonComponent,
    IconButtonComponent,
    CreateNamedItemDialogComponent,
    ConfirmDeleteDialogComponent
  ],
  templateUrl: './kanban-section.component.html',
  styleUrl: './kanban-section.component.css'
})
export class KanbanSectionComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  boards: BoardSummary[] = [];
  searchQuery = '';
  isLoading = true;
  alertMessage = '';
  isCreateDialogOpen = false;
  boardPendingDeletion: BoardSummary | null = null;

  private teamCode: string;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private requestSequence = 0;

  constructor(
    private router: Router,
    private boardService: BoardService,
    private teamService: TeamService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
  }

  handleSearchChange() {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }
    this.searchDebounceHandle = setTimeout(() => this.loadData(), 300);
  }

  handleOpenBoard(board: BoardSummary) {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, board.id]);
  }

  handleCreateBoard() {
    this.isCreateDialogOpen = true;
  }

  handleCreateConfirmed(event: { title: string }) {
    this.isCreateDialogOpen = false;

    this.boardService.createBoard(this.teamCode, event.title)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.KANBAN_BOARDS, response.board.id]);
      });
  }

  handleCreateCancelled() {
    this.isCreateDialogOpen = false;
  }

  requestDeleteBoard(board: BoardSummary) {
    this.boardPendingDeletion = board;
  }

  handleDeleteCancelled() {
    this.boardPendingDeletion = null;
  }

  handleDeleteConfirmed() {
    if (!this.boardPendingDeletion) {
      return;
    }

    const boardId = this.boardPendingDeletion.id;
    this.boardPendingDeletion = null;

    this.boardService.deleteBoard(this.teamCode, boardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.loadData();
      });
  }

  private loadData() {
    const sequence = ++this.requestSequence;

    this.boardService.listBoards(this.teamCode, this.searchQuery || undefined)
      .then((response) => {
        if (sequence !== this.requestSequence) {
          return;
        }
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.boards = response.boards;
      });
  }
}
