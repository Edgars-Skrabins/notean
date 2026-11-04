import {Router} from '@angular/router';
import {BehaviorSubject} from 'rxjs';
import {getStartedActions, HomeGetStartedComponent} from './home-get-started.component';
import {TeamService} from '@services/team.service';
import {NavigationService} from '@services/navigation.service';
import {TeamFeatures, TeamRole} from '@models/team.model';
import {AppRoutes} from '../../app/app-routes.enum';
import {boardDetail} from '../../testing/boardFixtures';

const ALL_ON: TeamFeatures = {pages: true, diagrams: true, boards: true, chat: true};
const ALL_OFF: TeamFeatures = {pages: false, diagrams: false, boards: false, chat: true};

describe('getStartedActions', () => {
  it('offers every create and the invite to owners and admins', () => {
    expect(getStartedActions(ALL_ON, 'owner')).toEqual(['page', 'diagram', 'board', 'invite']);
    expect(getStartedActions(ALL_ON, 'admin')).toEqual(['page', 'diagram', 'board', 'invite']);
  });

  it('leaves the invite out for regular members', () => {
    expect(getStartedActions(ALL_ON, 'user')).toEqual(['page', 'diagram', 'board']);
  });

  it('leaves out the creates of features that are off', () => {
    expect(getStartedActions({...ALL_ON, diagrams: false}, 'user')).toEqual(['page', 'board']);
    expect(getStartedActions(ALL_OFF, 'admin')).toEqual(['invite']);
    expect(getStartedActions(ALL_OFF, 'user')).toEqual([]);
  });
});

describe('HomeGetStartedComponent', () => {
  let component: HomeGetStartedComponent;
  let router: jasmine.SpyObj<Router>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let features: BehaviorSubject<TeamFeatures>;

  function create(role: TeamRole) {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    features = new BehaviorSubject<TeamFeatures>(ALL_ON);
    const teamService = {features$: features, getCurrentRole: () => role} as unknown as TeamService;
    component = new HomeGetStartedComponent(router, teamService, navigationService);
    component.ngOnInit();
  }

  it('follows the team features and has no actions when none are allowed', () => {
    create('user');
    expect(component.hasActions).toBeTrue();

    features.next(ALL_OFF);

    expect(component.actions).toEqual([]);
    expect(component.hasActions).toBeFalse();
  });

  it('opens the blank page and diagram create popups', () => {
    create('owner');

    component.handleAction('page');
    component.handleAction('diagram');

    expect(navigationService.navigate.calls.allArgs()).toEqual([
      [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, AppRoutes.NEW],
      [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, AppRoutes.NEW],
    ]);
  });

  it('opens Manage team to invite teammates', () => {
    create('admin');

    component.handleAction('invite');

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.MANAGE_TEAM);
  });

  it('opens the create board dialog and the created board', () => {
    create('user');

    component.handleAction('board');
    expect(component.isCreateBoardOpen).toBeTrue();

    component.handleBoardCreated(boardDetail());

    expect(component.isCreateBoardOpen).toBeFalse();
    expect(router.navigate).toHaveBeenCalledOnceWith([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 9, AppRoutes.KANBAN]);
  });
});
