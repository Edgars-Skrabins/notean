import {Component, Input, OnInit} from '@angular/core';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {TeamService} from "@services/team.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {BoardSummary} from "@models/board.model";
import {IconComponent} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {AppRoutes} from "../../app/app-routes.enum";
import {boardRoute} from "@utils/ticketRoute";

@Component({
  selector: 'app-sidebar-boards',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    RouterLink,
    RouterLinkActive,
    CdkDropList,
    CdkDrag,
    TranslateModule,
    IconComponent,
    CreateNamedItemDialogComponent,
    TooltipDirective
  ],
  templateUrl: './sidebar-boards.component.html',
  styleUrl: './sidebar-boards.component.css'
})
export class SidebarBoardsComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  @Input() collapsed = false;

  isCreateDialogOpen = false;

  constructor(
    private router: Router,
    protected boardListService: BoardListService,
    private boardService: BoardService,
    private teamService: TeamService,
    private projectFilterService: ProjectFilterService
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

  handleCreateConfirmed(event: { title: string }) {
    this.isCreateDialogOpen = false;

    this.boardService.createBoard(this.teamService.getCurrentTeamCode(), event.title, this.projectFilterService.getSelectedProjectId())
      .then((response) => {
        if (!response.success) {
          return;
        }

        this.boardListService.add(response.board);
        this.handleOpen(response.board);
      });
  }
}
