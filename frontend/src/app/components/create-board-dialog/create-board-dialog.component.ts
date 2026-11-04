import {Component, EventEmitter, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {BoardService} from "@services/board.service";
import {BoardListService} from "@services/board-list.service";
import {TeamService} from "@services/team.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {BoardSummary} from "@models/board.model";
import {CreateNamedItemDialogComponent} from "@components/create-named-item-dialog/create-named-item-dialog.component";
import {BoardTemplateSelectComponent} from "@components/board-template-select/board-template-select.component";
import {errorPhrase} from "@utils/errorPhrase";

@Component({
  selector: 'app-create-board-dialog',
  imports: [
    TranslatePipe,
    CreateNamedItemDialogComponent,
    BoardTemplateSelectComponent
  ],
  templateUrl: './create-board-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './create-board-dialog.component.css'
})
export class CreateBoardDialogComponent {
  protected readonly PHRASES = PHRASES;

  @Output() created = new EventEmitter<BoardSummary>();
  @Output() cancelled = new EventEmitter<void>();

  selectedTemplateId: number | null = null;
  createErrorMessage = '';

  constructor(
    private boardService: BoardService,
    private boardListService: BoardListService,
    private teamService: TeamService,
    private projectFilterService: ProjectFilterService
  ) {
  }

  handleCreateConfirmed(event: { title: string }) {
    this.boardService.createBoard(this.teamService.getCurrentTeamCode(), event.title, this.projectFilterService.getSelectedProjectId(), this.selectedTemplateId)
      .then((response) => {
        if (!response.success) {
          this.createErrorMessage = errorPhrase(response.code);
          return;
        }

        this.boardListService.add(response.board);
        this.created.emit(response.board);
      });
  }
}
