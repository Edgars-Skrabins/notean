import {Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardListService} from "@services/board-list.service";
import {BoardSummary} from "@models/board.model";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {CreateBoardDialogComponent} from "@components/create-board-dialog/create-board-dialog.component";
import {AppRoutes} from "../../app/app-routes.enum";
import {boardRoute} from "@utils/ticketRoute";

@Component({
  selector: 'app-sidebar-boards',
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    CdkDropList,
    CdkDrag,
    TranslatePipe,
    IconComponent,
    CreateBoardDialogComponent,
    TooltipDirective
  ],
  templateUrl: './sidebar-boards.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar-boards.component.css'
})
export class SidebarBoardsComponent implements OnInit {
  protected readonly PHRASES = PHRASES;
  protected readonly AppRoutes = AppRoutes;

  @Input() collapsed = false;

  isCreateDialogOpen = false;

  constructor(
    private router: Router,
    protected boardListService: BoardListService
  ) {
  }

  ngOnInit() {
    this.boardListService.load();
  }

  boardLink(board: BoardSummary): (string | number)[] {
    return ['/', AppRoutes.DASHBOARD, AppRoutes.BOARDS, board.id];
  }

  trackById(_index: number, board: BoardSummary): number {
    return board.id;
  }

  handleToggle() {
    this.boardListService.toggleOpen();
  }

  handleOpen(board: BoardSummary) {
    this.router.navigate(boardRoute(board.id));
  }

  handleDrop(event: CdkDragDrop<BoardSummary[]>) {
    if (event.previousIndex !== event.currentIndex) {
      this.boardListService.move(event.previousIndex, event.currentIndex);
    }
  }

  handleCreate() {
    this.isCreateDialogOpen = true;
  }

  handleCreateCancelled() {
    this.isCreateDialogOpen = false;
  }

  handleCreated(board: BoardSummary) {
    this.isCreateDialogOpen = false;
    this.handleOpen(board);
  }
}
