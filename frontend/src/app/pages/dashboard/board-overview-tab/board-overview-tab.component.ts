import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {chartColor} from "@config/chartColors";
import {BoardService} from "@services/board.service";
import {BoardOverview, RecentTicket} from "@models/board.model";
import {PieChartComponent, PieSlice} from "@components/pie-chart/pie-chart.component";
import {errorPhrase} from "@utils/errorPhrase";
import {relativeDate} from "@utils/relativeDate";
import {ticketRoute} from "@utils/ticketRoute";
import {BoardPageStateService} from "../board-page/board-page-state.service";

@Component({
  selector: 'app-board-overview-tab',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    TranslateModule,
    PieChartComponent
  ],
  templateUrl: './board-overview-tab.component.html',
  styleUrl: './board-overview-tab.component.css'
})
export class BoardOverviewTabComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  overview: BoardOverview | null = null;
  alertMessage = '';

  constructor(
    private router: Router,
    private state: BoardPageStateService,
    private boardService: BoardService,
    private translateService: TranslateService
  ) {
  }

  get columnSlices(): PieSlice[] {
    return (this.overview?.columns ?? []).map((column, index) => ({
      label: column.title,
      value: column.ticketCount,
      color: chartColor(index),
    }));
  }

  get maxColumnCount(): number {
    return Math.max(1, ...(this.overview?.columns ?? []).map((column) => column.ticketCount));
  }

  ngOnInit() {
    this.boardService.getOverview(this.state.teamCode, this.state.boardId)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = errorPhrase(response.code);
          return;
        }
        this.overview = response.overview;
      });
  }

  updatedAgo(ticket: RecentTicket): string {
    return relativeDate(ticket.updatedAt, this.translateService.currentLang ?? this.translateService.defaultLang);
  }

  handleOpenTicket(ticket: RecentTicket) {
    this.router.navigate(ticketRoute(this.state.boardId, ticket.id, ticket.columnId === null));
  }
}
