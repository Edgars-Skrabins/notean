import {fakeAsync, flushMicrotasks, TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {TranslateModule} from "@ngx-translate/core";
import {TicketDetailComponent} from "./ticket-detail.component";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {ProjectService} from "@services/project.service";
import {ProjectDetail} from "@models/project.model";
import {ToastType} from "@models/toast.model";
import {TicketDetail} from "@models/ticket.model";
import {PHRASES} from "@config/phrases";
import {DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH} from "@config/contentLimits";
import {EscapeService} from "@services/escape.service";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, ticketDetail} from "../../../testing/boardFixtures";
import {escapeServiceStub, EscapeServiceStub} from "../../../testing/escapeServiceStub";

describe('TicketDetailComponent editing', () => {
  let component: TicketDetailComponent;
  let ticketService: jasmine.SpyObj<TicketService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let teamService: jasmine.SpyObj<TeamService>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let state: BoardPageStateService;
  let ticket: TicketDetail;
  let escape: EscapeServiceStub;
  const route = {snapshot: {paramMap: new Map([['ticketId', '1']])}} as unknown as ActivatedRoute;

  beforeEach(() => {
    ticketService = jasmine.createSpyObj('TicketService', ['updateTicket', 'getTicket', 'moveToBacklog', 'moveTicket', 'deleteTicket', 'addAssignee', 'removeAssignee']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']);
    ticketService.getTicket.and.returnValue(new Promise(() => undefined));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['fetchTeamMembers']);
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([{id: 5, nickname: 'Bob', role: 'user', avatar: {color: 'red', imageUrl: null}}]));
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject']);
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({id: 1, email: 'alice@example.com'});
    state = createBoardState();
    escape = escapeServiceStub();
    component = new TicketDetailComponent(route, router, state, ticketService, favoriteService, toastService, teamService, projectService, authService, escape.service);

    ticket = {...ticketDetail(1, 10), title: 'My Ticket'};
    component.ticket = ticket;
    component.titleDraft = ticket.title;
    component.descriptionDraft = ticket.description;
  });

  it('commitTitle reverts the draft and skips the request when the title is blank', () => {
    component.titleDraft = '   ';

    component.commitTitle();

    expect(component.titleDraft).toBe('My Ticket');
    expect(ticketService.updateTicket).not.toHaveBeenCalled();
  });

  it('commitTitle skips the request when the title is unchanged', () => {
    component.titleDraft = ' My Ticket ';

    component.commitTitle();

    expect(ticketService.updateTicket).not.toHaveBeenCalled();
  });

  it('commitTitle sends the trimmed title and applies the returned ticket', fakeAsync(() => {
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: true, ticket: {...ticket, title: 'Renamed'}}));
    component.titleDraft = '  Renamed  ';

    component.commitTitle();
    flushMicrotasks();

    expect(ticketService.updateTicket).toHaveBeenCalledWith('abc', 9, 0, {title: 'Renamed'});
    expect(component.ticket?.title).toBe('Renamed');
    expect(component.titleDraft).toBe('Renamed');
    expect(favoriteService.renameItem).toHaveBeenCalledWith('Ticket', 1, 'Renamed');
    expect(state.findTicket(1)?.title).toBe('Renamed');
  }));

  it('commitTitle shows the error and keeps the draft when the request fails', fakeAsync(() => {
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));
    component.titleDraft = 'Renamed';

    component.commitTitle();
    flushMicrotasks();

    expect(component.alertMessage).toBe('ERRORS.TICKETS.TICKET_UPDATE_FAILED');
    expect(component.ticket?.title).toBe('My Ticket');
    expect(component.titleDraft).toBe('Renamed');
  }));

  it('closes the popup on Escape', () => {
    component.ngOnInit();

    escape.press();

    expect(router.navigate).toHaveBeenCalledWith(['../..'], {relativeTo: route});
  });

  it('cancelTitleEdit restores the saved title and consumes Esc', () => {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});
    component.titleDraft = 'Renamed';

    component.cancelTitleEdit(event);

    expect(component.titleDraft).toBe('My Ticket');
    expect(event.defaultPrevented).toBeTrue();
  });

  it('cancelTitleEdit leaves Esc to the popup when the title is unchanged', () => {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});

    component.cancelTitleEdit(event);

    expect(event.defaultPrevented).toBeFalse();
  });

  it('commitDescription skips the request when the description is unchanged', () => {
    component.commitDescription();

    expect(ticketService.updateTicket).not.toHaveBeenCalled();
  });

  it('commitDescription sends the description and applies the returned ticket', fakeAsync(() => {
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: true, ticket: {...ticket, description: 'New details'}}));
    component.descriptionDraft = 'New details';

    component.commitDescription();
    flushMicrotasks();

    expect(ticketService.updateTicket).toHaveBeenCalledWith('abc', 9, 0, {description: 'New details'});
    expect(component.ticket?.description).toBe('New details');
    expect(component.descriptionDraft).toBe('New details');
  }));

  it('commitDescription shows the error when the request fails', fakeAsync(() => {
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));
    component.descriptionDraft = 'New details';

    component.commitDescription();
    flushMicrotasks();

    expect(component.alertMessage).toBe('ERRORS.TICKETS.TICKET_UPDATE_FAILED');
    expect(component.ticket?.description).toBe('Details');
  }));

  it('cancelDescriptionEdit restores the saved description and consumes Esc', () => {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});
    component.descriptionDraft = 'New details';

    component.cancelDescriptionEdit(event);

    expect(component.descriptionDraft).toBe('Details');
    expect(event.defaultPrevented).toBeTrue();
  });

  it('cancelDescriptionEdit leaves Esc to the popup when the description is unchanged', () => {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});

    component.cancelDescriptionEdit(event);

    expect(event.defaultPrevented).toBeFalse();
  });

  it('loads the ticket from the route on init', fakeAsync(() => {
    ticketService.getTicket.and.returnValue(Promise.resolve({success: true, ticket}));

    component.ngOnInit();
    flushMicrotasks();

    expect(ticketService.getTicket).toHaveBeenCalledWith('abc', 9, 1);
  }));

  it('moves a board ticket to the backlog and updates the board', fakeAsync(() => {
    ticketService.moveToBacklog.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(1, null, 2)}));
    component.ngOnInit();

    component.handleMoveToBacklog();
    flushMicrotasks();

    expect(component.ticket?.columnId).toBeNull();
    expect(state.board!.backlog.map((item) => item.id)).toEqual([3, 4, 1]);
  }));

  it('moves a backlog ticket to the chosen column', fakeAsync(() => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(1, 11, 0)}));
    component.ngOnInit();
    component.handleOpenMoveDialog();

    component.handleMoveToColumn({columnId: 11});
    flushMicrotasks();

    expect(component.isMoveDialogOpen).toBeFalse();
    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 1, {columnId: 11});
    expect(state.board!.columns[1].tickets.map((item) => item.id)).toEqual([1]);
  }));

  it('shows a toast when a move fails', fakeAsync(() => {
    ticketService.moveToBacklog.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));

    component.handleMoveToBacklog();
    flushMicrotasks();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
    expect(state.board!.columns[0].tickets.map((item) => item.id)).toEqual([1, 2]);
  }));

  it('deletes the ticket, removes it from the board and closes back to the tab', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true}));
    component.ngOnInit();

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(state.findTicket(1)).toBeNull();
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 1);
    expect(router.navigate).toHaveBeenCalledWith(['../..'], {relativeTo: route});
  }));

  it('loads the team members for the picker and knows the current user', fakeAsync(() => {
    component.ngOnInit();
    flushMicrotasks();

    expect(teamService.fetchTeamMembers).toHaveBeenCalledWith('abc');
    expect(component.members.map((member) => member.nickname)).toEqual(['Bob']);
    expect(component.currentUserId).toBe(1);
  }));

  it('adds an assignee and updates the row on the board', fakeAsync(() => {
    const bob = {id: 5, nickname: 'Bob', avatar: {color: 'red' as const, imageUrl: null}};
    ticketService.addAssignee.and.returnValue(Promise.resolve({success: true, ticket: {...ticket, assignees: [bob]}}));
    component.ngOnInit();

    component.handleAddAssignee(5);
    expect(component.isUpdatingAssignees).toBeTrue();
    flushMicrotasks();

    expect(ticketService.addAssignee).toHaveBeenCalledWith('abc', 9, 1, 5);
    expect(component.ticket?.assignees).toEqual([bob]);
    expect(state.findTicket(1)?.assignees).toEqual([bob]);
    expect(component.isUpdatingAssignees).toBeFalse();
  }));

  it('keeps the assignees and shows a toast when removing fails', fakeAsync(() => {
    ticketService.removeAssignee.and.returnValue(Promise.resolve({success: false, code: 'ASSIGNEE_NOT_FOUND'}));
    component.ngOnInit();

    component.handleRemoveAssignee(5);
    flushMicrotasks();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.ASSIGNEES_UPDATE_FAILED});
    expect(component.ticket?.assignees).toEqual([]);
    expect(component.isUpdatingAssignees).toBeFalse();
  }));

  it('offers only people who can see a project board', fakeAsync(() => {
    state.board!.projectId = 4;
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([
      {id: 1, nickname: 'Alice', role: 'owner', avatar: {color: 'red', imageUrl: null}},
      {id: 5, nickname: 'Bob', role: 'user', avatar: {color: 'red', imageUrl: null}},
      {id: 6, nickname: 'Carol', role: 'user', avatar: {color: 'red', imageUrl: null}},
    ]));
    projectService.getProject.and.returnValue(Promise.resolve({success: true, project: {members: [{id: 6}]} as ProjectDetail}));

    component.ngOnInit();
    flushMicrotasks();

    expect(projectService.getProject).toHaveBeenCalledWith('abc', 4);
    expect(component.members.map((member) => member.nickname)).toEqual(['Alice', 'Carol']);
  }));

  it('offers No priority and the board priorities in order with their colours', () => {
    expect(component.priorityOptions).toEqual([
      {value: null, labelKey: PHRASES.NO_PRIORITY},
      {value: 20, label: 'Low', color: 'blue'},
      {value: 21, label: 'High', color: 'orange'},
    ]);
  });

  it('saves a chosen priority and updates the ticket on the board', fakeAsync(() => {
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: true, ticket: {...ticket, priorityId: 21}}));

    component.handlePriorityChange(21);
    flushMicrotasks();

    expect(ticketService.updateTicket).toHaveBeenCalledWith('abc', 9, 0, {priorityId: 21});
    expect(component.ticket?.priorityId).toBe(21);
    expect(state.findTicket(1)?.priorityId).toBe(21);
  }));

  it('sends null when No priority is chosen', fakeAsync(() => {
    state.findTicket(1)!.priorityId = 21;
    ticketService.updateTicket.and.returnValue(Promise.resolve({success: true, ticket: {...ticket, priorityId: null}}));

    component.handlePriorityChange(null);
    flushMicrotasks();

    expect(ticketService.updateTicket).toHaveBeenCalledWith('abc', 9, 0, {priorityId: null});
    expect(state.findTicket(1)?.priorityId).toBeNull();
  }));

  it('applies a remote change to the fields that are not being edited', () => {
    state.findTicket(1)!.title = 'Renamed elsewhere';
    state.findTicket(1)!.priorityId = 21;

    component.applyRemoteChange(new Map([[1, 'New details']]));

    expect(component.ticket?.title).toBe('Renamed elsewhere');
    expect(component.titleDraft).toBe('Renamed elsewhere');
    expect(component.ticket?.priorityId).toBe(21);
    expect(component.ticket?.description).toBe('New details');
    expect(component.descriptionDraft).toBe('New details');
  });

  it('keeps a focused title draft but updates the saved title behind it', () => {
    component.handleTitleFocus();
    component.titleDraft = 'My draft';
    state.findTicket(1)!.title = 'Renamed elsewhere';

    component.applyRemoteChange(new Map());

    expect(component.titleDraft).toBe('My draft');
    expect(component.ticket?.title).toBe('Renamed elsewhere');
  });

  it('keeps a description draft being edited', () => {
    component.handleDescriptionFocus();
    component.descriptionDraft = 'My notes';

    component.applyRemoteChange(new Map([[1, 'New details']]));

    expect(component.descriptionDraft).toBe('My notes');
    expect(component.ticket?.description).toBe('New details');
  });

  it('keeps the description when the change carries none', () => {
    component.applyRemoteChange(new Map());

    expect(component.ticket?.description).toBe('Details');
    expect(component.descriptionDraft).toBe('Details');
  });

  it('closes with a toast when the ticket is deleted elsewhere', () => {
    component.ngOnInit();
    state.removeTickets([1]);

    state.remoteChanges$.next(new Map());

    expect(router.navigate).toHaveBeenCalledOnceWith(['../..'], {relativeTo: route});
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.INFO, message: PHRASES.TICKET_WAS_DELETED});
    component.ngOnDestroy();
  });

  it('does not report its own deletion as a remote one', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true}));
    component.ngOnInit();

    component.handleConfirmDelete();
    state.removeTickets([1]);
    state.remoteChanges$.next(new Map());
    flushMicrotasks();

    expect(toastService.show).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['../..'], {relativeTo: route});
    component.ngOnDestroy();
  }));

  it('stops following remote changes once closed', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    state.removeTickets([1]);

    state.remoteChanges$.next(new Map());

    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('TicketDetailComponent input limits', () => {
  it('limits the title input and the description textarea to the content limits', async () => {
    const ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['getTicket']);
    ticketService.getTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(1, 10)}));
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['fetchTeamMembers', 'getCurrentTeamCode']);
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    teamService.getCurrentTeamCode.and.returnValue('abc');
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({id: 1, email: 'alice@example.com'});

    await TestBed.configureTestingModule({
      imports: [TicketDetailComponent, TranslateModule.forRoot()],
      providers: [
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: new Map([['ticketId', '1']])}}},
        {provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate'])},
        {provide: BoardPageStateService, useValue: createBoardState()},
        {provide: TicketService, useValue: ticketService},
        {provide: FavoriteService, useValue: jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem', 'isFavorited'])},
        {provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show'])},
        {provide: TeamService, useValue: teamService},
        {provide: ProjectService, useValue: jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject'])},
        {provide: AuthService, useValue: authService},
        {provide: EscapeService, useValue: escapeServiceStub().service},
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TicketDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const title: HTMLInputElement = fixture.nativeElement.querySelector('.ticketDetail__titleInput');
    const description: HTMLTextAreaElement = fixture.nativeElement.querySelector('.ticketDetail__descriptionInput');
    expect(title.maxLength).toBe(TITLE_MAX_LENGTH);
    expect(description.maxLength).toBe(DESCRIPTION_MAX_LENGTH);
  });
});
