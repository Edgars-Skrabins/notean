import {Component, OnDestroy, OnInit} from '@angular/core';
import {skip, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {NgFor, NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {MyWorkService, groupMyWork} from '@services/my-work.service';
import {TeamService} from '@services/team.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {MyWorkGroup, MyWorkTicket} from '@models/my-work.model';
import {AvatarStackComponent} from '@components/avatar-stack/avatar-stack.component';
import {boardRoute, ticketRoute} from '@utils/ticketRoute';

@Component({
  selector: 'app-my-work',
  imports: [
    NgFor,
    NgIf,
    TranslateModule,
    AvatarStackComponent
  ],
  templateUrl: './my-work.component.html',
  styleUrl: './my-work.component.css'
})
export class MyWorkComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  groups: MyWorkGroup[] = [];
  isLoading = true;
  hasError = false;

  private projectSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private myWorkService: MyWorkService,
    private teamService: TeamService,
    private projectFilterService: ProjectFilterService
  ) {
  }

  ngOnInit() {
    this.load();
    this.projectSubscription = this.projectFilterService.selectedProjectId$.pipe(skip(1)).subscribe(() => this.load());
  }

  ngOnDestroy() {
    this.projectSubscription?.unsubscribe();
  }

  handleOpenBoard(group: MyWorkGroup) {
    this.router.navigate(boardRoute(group.boardId));
  }

  handleOpenTicket(ticket: MyWorkTicket) {
    this.router.navigate(ticketRoute(ticket.boardId, ticket.id, ticket.columnId === null));
  }

  private load() {
    this.myWorkService.listMyWork(this.teamService.getCurrentTeamCode(), this.projectFilterService.getSelectedProjectId())
      .then((response) => {
        this.isLoading = false;
        this.hasError = !response.success;
        this.groups = response.success ? groupMyWork(response.tickets) : [];
      });
  }
}
