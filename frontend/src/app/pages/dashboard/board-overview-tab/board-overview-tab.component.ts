import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Router} from '@angular/router';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {defaultLanguage} from "@config/translationConfig";
import {BoardService} from "@services/board.service";
import {BoardOverview, RecentTicket} from "@models/board.model";
import {BarListComponent, BarListRow} from "@components/bar-list/bar-list.component";
import {errorPhrase} from "@utils/errorPhrase";
import {relativeDate} from "@utils/relativeDate";
import {ticketRoute} from "@utils/ticketRoute";
import {BoardPageStateService} from "../board-page/board-page-state.service";

@Component({
  selector: 'app-board-overview-tab',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    BarListComponent
  ],
  templateUrl: './board-overview-tab.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './board-overview-tab.component.css'
})
export class BoardOverviewTabComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  overview: BoardOverview | null = null;
  statusRows: BarListRow[] = [];
  assigneeRows: BarListRow[] = [];
  alertMessage = '';

  constructor(
    private router: Router,
    private state: BoardPageStateService,
    private boardService: BoardService,
    private translateService: TranslateService
  ) {
  }

  ngOnInit() {
    this.boardService.getOverview(this.state.teamCode, this.state.boardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }
        this.overview = response.overview;
        this.statusRows = this.buildStatusRows(response.overview);
        this.assigneeRows = this.buildAssigneeRows(response.overview);
      });
  }

  private buildStatusRows(overview: BoardOverview): BarListRow[] {
    return [
      {label: this.translateService.instant(PHRASES.BACKLOG), value: overview.backlogTickets},
      ...overview.columns.map((column) => ({label: column.title, value: column.ticketCount})),
    ];
  }

  private buildAssigneeRows(overview: BoardOverview): BarListRow[] {
    const rows = overview.assignees.filter((row) => row.ticketCount > 0);
    return [...rows.filter((row) => row.user !== null), ...rows.filter((row) => row.user === null)].map((row) => ({
      label: row.user?.nickname ?? this.translateService.instant(PHRASES.UNASSIGNED),
      value: row.ticketCount,
    }));
  }

  updatedAgo(ticket: RecentTicket): string {
    return relativeDate(ticket.updatedAt, this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage);
  }

  handleOpenTicket(ticket: RecentTicket) {
    this.router.navigate(ticketRoute(this.state.boardId, ticket.id, ticket.columnId === null));
  }
}
