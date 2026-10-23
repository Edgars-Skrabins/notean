import {Component} from '@angular/core';
import {fakeAsync, flushMicrotasks, TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter, Route, Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {ListTabComponent} from "./list-tab.component";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {ToastType} from "@models/toast.model";
import {TicketSummary} from "@models/ticket.model";
import {BoardUser} from "@models/board.model";
import {PHRASES} from "@config/phrases";
import {routes} from "../../../app/app.routes";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, ticketDetail, ticketSummary} from "../../../testing/boardFixtures";

describe('ListTabComponent', () => {
  let component: ListTabComponent;
  let state: BoardPageStateService;
  let ticketService: jasmine.SpyObj<TicketService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;
  const bob: BoardUser = {id: 5, nickname: 'bob', avatar: {color: 'blue', imageUrl: null}};

  beforeEach(() => {
    state = createBoardState();
    ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['createTicket', 'reorderBacklog', 'moveTicket', 'deleteTicket', 'bulkUpdate', 'bulkDelete']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['fetchTeamMembers']);
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
    component = new ListTabComponent(
      {} as ActivatedRoute,
      jasmine.createSpyObj<Router>('Router', ['navigate']),
      state,
      ticketService,
      favoriteService,
      toastService,
      teamService,
      jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject'])
    );
  });

  function backlogIds(): number[] {
    return state.board!.backlog.map((ticket) => ticket.id);
  }

  function visibleIds(): number[][] {
    return component.groups.map((group) => group.visibleTickets.map((ticket) => ticket.id));
  }

  function drop(previousIndex: number, currentIndex: number): CdkDragDrop<TicketSummary[]> {
    return {previousIndex, currentIndex} as CdkDragDrop<TicketSummary[]>;
  }

  it('groups the tickets by status: Backlog first, then each column', () => {
    expect(component.groups.map((group) => group.status.columnId)).toEqual([null, 10, 11]);
    expect(visibleIds()).toEqual([[3, 4], [1, 2], []]);
  });

  it('combines the title search with the assignee and status filters', () => {
    state.board!.backlog[0].title = 'Fix login';
    state.board!.backlog[1].title = 'Fix logout';
    state.board!.backlog[1].assignees = [bob];
    state.board!.columns[0].tickets[0].title = 'Fix header';
    state.board!.columns[0].tickets[0].assignees = [bob];

    component.searchQuery = '  FIX ';
    component.handleFiltersChange({assigneeIds: new Set([bob.id]), columnIds: new Set([null])});

    expect(component.groups.map((group) => group.status.columnId)).toEqual([null]);
    expect(visibleIds()).toEqual([[4]]);
  });

  it('shows only tickets without assignees for the Unassigned filter, or-ed with members', () => {
    state.board!.backlog[1].assignees = [bob];

    component.handleFiltersChange({assigneeIds: new Set(['none']), columnIds: new Set()});
    expect(visibleIds()).toEqual([[3], [1, 2], []]);

    component.handleFiltersChange({assigneeIds: new Set<number | 'none'>(['none', bob.id]), columnIds: new Set()});
    expect(visibleIds()).toEqual([[3, 4], [1, 2], []]);
  });

  it('selects only the visible tickets of a group', () => {
    component.searchQuery = 'Ticket 1';
    const todo = component.groups[1];

    component.setGroupSelected(todo, true);

    expect([...component.selectedIds]).toEqual([1]);
    expect(component.isGroupSelected(todo)).toBeTrue();
    component.searchQuery = '';
    expect(component.isGroupSelected(component.groups[1])).toBeFalse();
  });

  it('keeps selected tickets that become hidden selected and counted', () => {
    component.setSelected(state.board!.columns[0].tickets[1], true);
    component.setSelected(state.board!.backlog[0], true);

    component.handleFiltersChange({assigneeIds: new Set(), columnIds: new Set([null])});

    expect(visibleIds()).toEqual([[3, 4]]);
    expect(component.selectedTickets.map((ticket) => ticket.id)).toEqual([3, 2]);
  });

  it('sends a bulk status change in list order, applies the tickets and clears the selection', fakeAsync(() => {
    ticketService.bulkUpdate.and.returnValue(Promise.resolve({success: true, tickets: [ticketSummary(4, 11, 0), ticketSummary(1, 11, 1)]}));
    component.setSelected(state.board!.columns[0].tickets[0], true);
    component.setSelected(state.board!.backlog[1], true);

    component.handleBulkStatus(11);
    flushMicrotasks();

    expect(ticketService.bulkUpdate).toHaveBeenCalledWith('abc', 9, [4, 1], {columnId: 11});
    expect(visibleIds()).toEqual([[3], [2], [4, 1]]);
    expect(component.selectedIds.size).toBe(0);
  }));

  it('sends Backlog as to_backlog', () => {
    ticketService.bulkUpdate.and.returnValue(new Promise(() => undefined));
    component.setSelected(state.board!.columns[0].tickets[0], true);

    component.handleBulkStatus(null);

    expect(ticketService.bulkUpdate).toHaveBeenCalledWith('abc', 9, [1], {toBacklog: true});
  });

  it('keeps the selection and the board and shows a toast when a bulk action fails', fakeAsync(() => {
    ticketService.bulkUpdate.and.returnValue(Promise.resolve({success: false, code: 'TICKET_NOT_FOUND'}));
    component.setSelected(state.board!.backlog[0], true);

    component.handleBulkAssign(bob.id);
    flushMicrotasks();

    expect(component.selectedIds.has(3)).toBeTrue();
    expect(visibleIds()).toEqual([[3, 4], [1, 2], []]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.BULK_ACTION_FAILED});
  }));

  it('bulk deletes the selected tickets after confirmation and forgets their favorites', fakeAsync(() => {
    ticketService.bulkDelete.and.returnValue(Promise.resolve({success: true}));
    component.setSelected(state.board!.backlog[0], true);
    component.setSelected(state.board!.columns[0].tickets[1], true);
    component.requestBulkDelete();

    component.handleConfirmBulkDelete();
    flushMicrotasks();

    expect(ticketService.bulkDelete).toHaveBeenCalledWith('abc', 9, [3, 2]);
    expect(visibleIds()).toEqual([[4], [1], []]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 3);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 2);
    expect(component.selectedIds.size).toBe(0);
  }));

  it('offers to unassign the members assigned to any selected ticket', () => {
    state.board!.backlog[0].assignees = [bob];
    component.setSelected(state.board!.backlog[0], true);
    component.setSelected(state.board!.backlog[1], true);

    expect(component.assignedMembers).toEqual([bob]);
  });

  it('creates a ticket at the bottom of the backlog and keeps the field open and empty', fakeAsync(() => {
    ticketService.createTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(7, null, 2)}));
    component.handleStartCreate();
    component.newTicketTitle = '  Idea  ';

    component.handleCreate();
    flushMicrotasks();

    expect(ticketService.createTicket).toHaveBeenCalledWith('abc', 9, 'Idea', null);
    expect(backlogIds()).toEqual([3, 4, 7]);
    expect(component.isCreating).toBeTrue();
    expect(component.newTicketTitle).toBe('');
  }));

  it('ignores a blank title and closes an empty field', () => {
    component.handleStartCreate();
    component.newTicketTitle = '   ';

    component.handleCreate();
    component.handleCloseCreate();

    expect(ticketService.createTicket).not.toHaveBeenCalled();
    expect(component.isCreating).toBeFalse();
  });

  it('reorders the backlog and saves the new position', () => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(4, null, 0)}));

    component.handleDropped(component.groups[0], drop(1, 0));

    expect(backlogIds()).toEqual([4, 3]);
    expect(ticketService.reorderBacklog).toHaveBeenCalledWith('abc', 9, 4, 0);
  });

  it('reorders within a column using the full column position while filtered', () => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(2, 10, 0)}));
    state.board!.columns[0].tickets.push(ticketSummary(5, 10, 2));
    component.searchQuery = 'Ticket';
    state.board!.columns[0].tickets[1].title = 'Hidden';

    component.handleDropped(component.groups[1], drop(1, 0));

    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([5, 1, 2]);
    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 5, {columnId: 10, position: 0});
  });

  it('reverts the order and shows a toast when saving it fails', fakeAsync(() => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));

    component.handleDropped(component.groups[0], drop(1, 0));
    flushMicrotasks();

    expect(backlogIds()).toEqual([3, 4]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
  }));

  it('moves a backlog ticket to the chosen column', fakeAsync(() => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(3, 11, 0)}));
    component.handleMoveRequested(state.board!.backlog[0]);

    component.handleMoveConfirmed({columnId: 11});
    flushMicrotasks();

    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 3, {columnId: 11});
    expect(backlogIds()).toEqual([4]);
    expect(state.board!.columns[1].tickets.map((ticket) => ticket.id)).toEqual([3]);
  }));

  it('deletes a ticket, forgets its favorite and drops it from the selection', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true}));
    component.setSelected(state.board!.backlog[1], true);
    component.requestDelete(state.board!.backlog[1]);

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(backlogIds()).toEqual([3]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 4);
    expect(component.selectedIds.size).toBe(0);
  }));
});

describe('board tab routes', () => {
  @Component({standalone: true, template: ''})
  class StubComponent {
  }

  function stubbed(route: Route): Route {
    return route.component ? {...route, component: StubComponent, children: route.children?.map(stubbed)} : route;
  }

  beforeEach(() => {
    const dashboard = routes.find((route) => route.path === AppRoutes.DASHBOARD)!;
    const board = dashboard.children!.find((route) => route.path === `${AppRoutes.BOARDS}/:id`)!;
    TestBed.configureTestingModule({
      providers: [provideRouter([{path: 'boards/:id', children: board.children!.map(stubbed)}])],
    });
  });

  it('redirects the old backlog urls to the list tab', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/boards/9/backlog');
    expect(router.url).toBe('/boards/9/list');

    await router.navigateByUrl('/boards/9/backlog/tickets/3');
    expect(router.url).toBe('/boards/9/list/tickets/3');
  });
});
