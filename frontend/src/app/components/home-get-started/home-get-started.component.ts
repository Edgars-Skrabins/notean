import {Component, EventEmitter, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TeamService} from '@services/team.service';
import {NavigationService} from '@services/navigation.service';
import {TeamFeatures, TeamRole} from '@models/team.model';
import {BoardSummary} from '@models/board.model';
import {ButtonComponent} from '@components/button/button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {IconName} from '@components/icon/icon.component';
import {CreateBoardDialogComponent} from '@components/create-board-dialog/create-board-dialog.component';
import {AppRoutes} from '../../app/app-routes.enum';
import {boardRoute} from '@utils/ticketRoute';

export type GetStartedAction = 'page' | 'diagram' | 'board' | 'invite';

export function getStartedActions(features: TeamFeatures, role: TeamRole | null): GetStartedAction[] {
  const actions: GetStartedAction[] = [];
  if (features.pages) {
    actions.push('page');
  }
  if (features.diagrams) {
    actions.push('diagram');
  }
  if (features.boards) {
    actions.push('board');
  }
  if (role === 'owner' || role === 'admin') {
    actions.push('invite');
  }
  return actions;
}

const ACTION_BUTTONS: Record<GetStartedAction, { phrase: string, icon?: IconName }> = {
  page: {phrase: PHRASES.NEW_PAGE, icon: 'page'},
  diagram: {phrase: PHRASES.NEW_DIAGRAM, icon: 'diagram'},
  board: {phrase: PHRASES.NEW_BOARD, icon: 'board'},
  invite: {phrase: PHRASES.INVITE_TEAMMATES},
};

@Component({
  selector: 'app-home-get-started',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    IconButtonComponent,
    CreateBoardDialogComponent
  ],
  templateUrl: './home-get-started.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home-get-started.component.css'
})
export class HomeGetStartedComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly ACTION_BUTTONS = ACTION_BUTTONS;

  @Output() dismissed = new EventEmitter<void>();

  actions: GetStartedAction[] = [];
  isCreateBoardOpen = false;

  private subscription?: Subscription;

  constructor(
    private router: Router,
    private teamService: TeamService,
    private navigationService: NavigationService
  ) {
  }

  get hasActions(): boolean {
    return this.actions.length > 0;
  }

  ngOnInit() {
    this.subscription = this.teamService.features$.subscribe((features) => {
      this.actions = getStartedActions(features, this.teamService.getCurrentRole());
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  handleAction(action: GetStartedAction) {
    if (action === 'page') {
      this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, AppRoutes.NEW);
    } else if (action === 'diagram') {
      this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, AppRoutes.NEW);
    } else if (action === 'board') {
      this.isCreateBoardOpen = true;
    } else {
      this.navigationService.navigate(AppRoutes.MANAGE_TEAM);
    }
  }

  handleBoardCreated(board: BoardSummary) {
    this.isCreateBoardOpen = false;
    this.router.navigate(boardRoute(board.id));
  }
}
