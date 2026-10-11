import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {TicketDetailComponent} from "./ticket-detail.component";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {ToastType} from "@models/toast.model";
import {TicketDetail} from "@models/ticket.model";
import {PHRASES} from "@config/phrases";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, ticketDetail} from "../../../testing/boardFixtures";

describe('TicketDetailComponent editing', () => {
  let component: TicketDetailComponent;
  let ticketService: jasmine.SpyObj<TicketService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let teamService: jasmine.SpyObj<TeamService>;
  let state: BoardPageStateService;
  let ticket: TicketDetail;
  const route = {snapshot: {paramMap: new Map([['ticketId', '1']])}} as unknown as ActivatedRoute;

  beforeEach(() => {
    ticketService = jasmine.createSpyObj('TicketService', ['updateTicket', 'getTicket', 'moveToBacklog', 'moveTicket', 'deleteTicket', 'addAssignee', 'removeAssignee']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']);
    ticketService.getTicket.and.returnValue(new Promise(() => undefined));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    teamService = jasmine.createSpyObj<TeamService>('TeamService', ['fetchTeamMembers']);
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([{id: 5, nickname: 'Bob', role: 'user', avatar: {color: 'red', imageUrl: null}}]));
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue({id: 1, email: 'alice@example.com'});
    state = createBoardState();
    component = new TicketDetailComponent(route, router, state, ticketService, favoriteService, toastService, teamService, authService);

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

  it('cancelTitleEdit restores the saved title', () => {
    component.titleDraft = 'Renamed';

    component.cancelTitleEdit();

    expect(component.titleDraft).toBe('My Ticket');
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

  it('cancelDescriptionEdit restores the saved description', () => {
    component.descriptionDraft = 'New details';

    component.cancelDescriptionEdit();

    expect(component.descriptionDraft).toBe('Details');
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
});
