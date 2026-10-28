import {Component} from '@angular/core';
import {discardPeriodicTasks, fakeAsync, flushMicrotasks, TestBed, tick} from '@angular/core/testing';
import {ActivatedRoute, provideRouter, Route, Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {ListTabComponent} from "./list-tab.component";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {TeamService} from "@services/team.service";
import {ProjectService} from "@services/project.service";
import {BoardChannelService} from "@services/board-channel.service";
import {CableService} from "@services/cable.service";
import {NavigationService} from "@services/navigation.service";
import {ToastType} from "@models/toast.model";
import {TicketSummary} from "@models/ticket.model";
import {BoardUser} from "@models/board.model";
import {PHRASES} from "@config/phrases";
import {dashboardRoutes} from "../../../app/dashboard.routes";
import {AppRoutes} from "../../../app/app-routes.enum";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, fakeTicketList, ticketDetail, ticketSummary} from "../../../testing/boardFixtures";
import {trashServiceStub} from "../../../testing/trashServiceStub";

describe('ListTabComponent', () => {
  let component: ListTabComponent;
  let state: BoardPageStateService;
  let ticketService: jasmine.SpyObj<TicketService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;
  const bob: BoardUser = {id: 5, nickname: 'bob', avatar: {color: 'blue', imageUrl: null}};

  beforeEach(fakeAsync(() => {
    state = createBoardState();
    ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['list', 'createTicket', 'reorderBacklog', 'moveTicket', 'deleteTicket', 'bulkUpdate', 'bulkDelete']);
    ticketService.list.and.callFake(fakeTicketList(state));
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
      jasmine.createSpyObj<ProjectService>('ProjectService', ['getProject']),
      trashServiceStub().service
    );
    component.ngOnInit();
    flushMicrotasks();
  }));

  afterEach(() => component.ngOnDestroy());

  function backlogIds(): number[] {
    return state.board!.backlog.map((ticket) => ticket.id);
  }

  function visibleIds(): number[][] {
    return component.groups.map((group) => group.tickets.map((ticket) => ticket.id));
  }

  function loaded(id: number): TicketSummary {
    return component.groups.flatMap((group) => group.tickets).find((ticket) => ticket.id === id)!;
  }

  function drop(previousIndex: number, currentIndex: number): CdkDragDrop<TicketSummary[]> {
    return {previousIndex, currentIndex} as CdkDragDrop<TicketSummary[]>;
  }

  function page(tickets: TicketSummary[], hasMore: boolean) {
    return Promise.resolve({success: true as const, tickets, hasMore});
  }

  it('loads each status group through the tickets index: Backlog first, then each column', () => {
    expect(ticketService.list.calls.allArgs()).toEqual([
      ['abc', 9, {status: 'backlog', search: '', assigneeIds: [], tagIds: [], offset: 0}],
      ['abc', 9, {status: 10, search: '', assigneeIds: [], tagIds: [], offset: 0}],
      ['abc', 9, {status: 11, search: '', assigneeIds: [], tagIds: [], offset: 0}],
    ]);
    expect(component.groups.map((group) => group.status.columnId)).toEqual([null, 10, 11]);
    expect(visibleIds()).toEqual([[3, 4], [1, 2], []]);
  });

  it('searches the server 300 ms after typing stops and reloads the groups', fakeAsync(() => {
    ticketService.list.calls.reset();

    component.handleSearchChange('fi');
    tick(299);
    component.handleSearchChange(' fix ');
    tick(300);
    flushMicrotasks();

    expect(ticketService.list).toHaveBeenCalledTimes(3);
    expect(ticketService.list).toHaveBeenCalledWith('abc', 9, {status: 'backlog', search: 'fix', assigneeIds: [], tagIds: [], offset: 0});
    discardPeriodicTasks();
  }));

  it('reloads only the chosen status groups with the assignee filter', fakeAsync(() => {
    ticketService.list.calls.reset();

    component.handleFiltersChange({assigneeIds: new Set<number | 'none'>(['none', bob.id]), tagIds: new Set(), columnIds: new Set([null, 11])});
    flushMicrotasks();

    expect(component.groups.map((group) => group.status.columnId)).toEqual([null, 11]);
    expect(ticketService.list.calls.allArgs()).toEqual([
      ['abc', 9, {status: 'backlog', search: '', assigneeIds: ['none', bob.id], tagIds: [], offset: 0}],
      ['abc', 9, {status: 11, search: '', assigneeIds: ['none', bob.id], tagIds: [], offset: 0}],
    ]);
  }));

  it('clears the selection when the groups reload', fakeAsync(() => {
    component.setSelected(loaded(3), true);

    component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set([null])});
    flushMicrotasks();

    expect(component.selectedIds.size).toBe(0);
  }));

  it('loads more tickets of one group after the loaded ones', fakeAsync(() => {
    ticketService.list.and.returnValue(page([ticketSummary(3, null, 0), ticketSummary(4, null, 1)], true));
    component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set()});
    flushMicrotasks();

    ticketService.list.and.returnValue(page([ticketSummary(8, null, 2)], false));
    component.handleLoadMore(component.groups[0]);
    expect(component.groups[0].isLoading).toBeTrue();
    flushMicrotasks();

    expect(ticketService.list).toHaveBeenCalledWith('abc', 9, {status: 'backlog', search: '', assigneeIds: [], tagIds: [], offset: 2});
    expect(component.groups[0].tickets.map((ticket) => ticket.id)).toEqual([3, 4, 8]);
    expect(component.groups[0].hasMore).toBeFalse();
    expect(component.groups[0].isLoading).toBeFalse();
  }));

  it('selects all loaded tickets of a group only', () => {
    const todo = component.groups[1];

    component.setGroupSelected(todo, true);

    expect([...component.selectedIds]).toEqual([1, 2]);
    expect(component.isGroupSelected(todo)).toBeTrue();
    expect(component.isGroupSelected(component.groups[0])).toBeFalse();
    expect(component.selectedTickets.length).toBe(2);
  });

  it('sends a bulk status change in list order, applies the tickets and clears the selection', fakeAsync(() => {
    ticketService.bulkUpdate.and.returnValue(Promise.resolve({success: true, tickets: [ticketSummary(4, 11, 0), ticketSummary(1, 11, 1)]}));
    component.setSelected(loaded(1), true);
    component.setSelected(loaded(4), true);

    component.handleBulkStatus(11);
    flushMicrotasks();

    expect(ticketService.bulkUpdate).toHaveBeenCalledWith('abc', 9, [4, 1], {columnId: 11});
    expect(visibleIds()).toEqual([[3], [2], [4, 1]]);
    expect(component.selectedIds.size).toBe(0);
  }));

  it('sends Backlog as to_backlog', () => {
    ticketService.bulkUpdate.and.returnValue(new Promise(() => undefined));
    component.setSelected(loaded(1), true);

    component.handleBulkStatus(null);

    expect(ticketService.bulkUpdate).toHaveBeenCalledWith('abc', 9, [1], {toBacklog: true});
  });

  it('keeps the selection and the tickets and shows a toast when a bulk action fails', fakeAsync(() => {
    ticketService.bulkUpdate.and.returnValue(Promise.resolve({success: false, code: 'TICKET_NOT_FOUND'}));
    component.setSelected(loaded(3), true);

    component.handleBulkAssign(bob.id);
    flushMicrotasks();

    expect(component.selectedIds.has(3)).toBeTrue();
    expect(visibleIds()).toEqual([[3, 4], [1, 2], []]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.BULK_ACTION_FAILED});
  }));

  it('bulk deletes the selected tickets after confirmation and forgets their favorites', fakeAsync(() => {
    ticketService.bulkDelete.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));
    component.setSelected(loaded(3), true);
    component.setSelected(loaded(2), true);
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
    loaded(3).assignees = [bob];
    component.setSelected(loaded(3), true);
    component.setSelected(loaded(4), true);

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
    expect(visibleIds()[0]).toEqual([3, 4, 7]);
    expect(component.isCreating).toBeTrue();
    expect(component.newTicketTitle).toBe('');
  }));

  it('shows a created ticket in a partly loaded backlog and keeps the next page offset', fakeAsync(() => {
    ticketService.list.and.returnValue(page([ticketSummary(3, null, 0), ticketSummary(4, null, 1)], true));
    component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set()});
    flushMicrotasks();
    ticketService.createTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(7, null, 60)}));
    component.newTicketTitle = 'Idea';

    component.handleCreate();
    flushMicrotasks();
    ticketService.list.and.returnValue(page([ticketSummary(8, null, 2), ticketSummary(7, null, 60)], false));
    component.handleLoadMore(component.groups[0]);
    flushMicrotasks();

    expect(ticketService.list).toHaveBeenCalledWith('abc', 9, {status: 'backlog', search: '', assigneeIds: [], tagIds: [], offset: 2});
    expect(visibleIds()[0]).toEqual([3, 4, 8, 7]);
  }));

  it('ignores a blank title and closes an empty field', () => {
    component.handleStartCreate();
    component.newTicketTitle = '   ';

    component.handleCreate();
    component.handleCloseCreate();

    expect(ticketService.createTicket).not.toHaveBeenCalled();
    expect(component.isCreating).toBeFalse();
  });

  it('reorders the backlog and saves the new position', fakeAsync(() => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(4, null, 0)}));

    component.handleDropped(component.groups[0], drop(1, 0));
    expect(visibleIds()[0]).toEqual([4, 3]);
    flushMicrotasks();

    expect(ticketService.reorderBacklog).toHaveBeenCalledWith('abc', 9, 4, 0);
    expect(backlogIds()).toEqual([4, 3]);
    expect(component.groups[0].tickets.map((ticket) => [ticket.id, ticket.position])).toEqual([[4, 0], [3, 1]]);
  }));

  it('reorders within a filtered column using the position of the ticket it lands on', fakeAsync(() => {
    state.board!.columns[0].tickets.push(ticketSummary(5, 10, 2));
    ticketService.list.and.returnValue(page([ticketSummary(1, 10, 0), ticketSummary(5, 10, 2)], false));
    component.handleFiltersChange({assigneeIds: new Set([bob.id]), tagIds: new Set(), columnIds: new Set([10])});
    flushMicrotasks();
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(5, 10, 0)}));

    component.handleDropped(component.groups[0], drop(1, 0));
    flushMicrotasks();

    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 5, {columnId: 10, position: 0});
    expect(state.board!.columns[0].tickets.map((ticket) => ticket.id)).toEqual([5, 1, 2]);
    expect(component.groups[0].tickets.map((ticket) => [ticket.id, ticket.position])).toEqual([[5, 0], [1, 1]]);
  }));

  it('reverts the order and shows a toast when saving it fails', fakeAsync(() => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));

    component.handleDropped(component.groups[0], drop(1, 0));
    flushMicrotasks();

    expect(visibleIds()[0]).toEqual([3, 4]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
  }));

  it('moves a backlog ticket to the chosen column', fakeAsync(() => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(3, 11, 0)}));
    component.handleMoveRequested(loaded(3));

    component.handleMoveConfirmed({columnId: 11});
    flushMicrotasks();

    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 3, {columnId: 11});
    expect(backlogIds()).toEqual([4]);
    expect(visibleIds()).toEqual([[4], [1, 2], [3]]);
  }));

  it('deletes a ticket, forgets its favorite and drops it from the selection', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));
    component.setSelected(loaded(4), true);
    component.requestDelete(loaded(4));

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(backlogIds()).toEqual([3]);
    expect(visibleIds()[0]).toEqual([3]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 4);
    expect(component.selectedIds.size).toBe(0);
  }));

  it('shows ticket popup edits in the loaded row', () => {
    state.updateTicket({...ticketSummary(1, 10, 0), title: 'Renamed', assignees: [bob]});

    expect(loaded(1).title).toBe('Renamed');
    expect(loaded(1).assignees).toEqual([bob]);
  });

  describe('live updates', () => {
    let channel: BoardChannelService;

    function raw(id: number, columnId: number | null, position: number) {
      const ticket = ticketSummary(id, columnId, position);
      return {id, title: ticket.title, position, column_id: columnId, priority_id: null, lock_version: 0, assignees: [], created_at: ticket.createdAt, updated_at: ticket.updatedAt};
    }

    beforeEach(fakeAsync(() => {
      channel = new BoardChannelService(
        jasmine.createSpyObj<CableService>('CableService', ['subscribe']),
        state,
        jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']),
        toastService
      );
      ticketService.list.and.returnValue(page([ticketSummary(3, null, 0), ticketSummary(4, null, 1)], true));
      component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set([null])});
      flushMicrotasks();
    }));

    it('inserts a ticket that lands within the loaded range', () => {
      channel.handleMessage({type: 'tickets_upserted', tickets: [raw(8, null, 1), raw(4, null, 2)]});

      expect(visibleIds()).toEqual([[3, 8, 4]]);
    });

    it('shifts the loaded tickets so a remote move lands in the right place', () => {
      channel.handleMessage({type: 'tickets_shifted', shifts: [{column_id: null, from_position: 1, to_position: 4, delta: 1}]});
      channel.handleMessage({type: 'tickets_upserted', tickets: [raw(9, null, 1)]});

      expect(visibleIds()).toEqual([[3, 9, 4]]);
      expect(component.groups[0].tickets.map((ticket) => ticket.position)).toEqual([0, 1, 2]);
    });

    it('leaves out a ticket that lands past the loaded range', () => {
      channel.handleMessage({type: 'tickets_upserted', tickets: [raw(8, null, 5)]});

      expect(visibleIds()).toEqual([[3, 4]]);
    });

    it('moves a loaded ticket into another fully loaded group', fakeAsync(() => {
      ticketService.list.and.callFake(fakeTicketList(state));
      component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set(), columnIds: new Set()});
      flushMicrotasks();

      channel.handleMessage({type: 'tickets_upserted', tickets: [raw(3, 10, 2)]});

      expect(visibleIds()).toEqual([[4], [1, 2, 3], []]);
    }));

    it('removes deleted tickets', () => {
      channel.handleMessage({type: 'tickets_removed', ticket_ids: [3]});

      expect(visibleIds()).toEqual([[4]]);
    });

    it('updates loaded tickets but inserts none while filtering', fakeAsync(() => {
      component.handleFiltersChange({assigneeIds: new Set(['none']), tagIds: new Set(), columnIds: new Set([null])});
      flushMicrotasks();

      channel.handleMessage({type: 'tickets_upserted', tickets: [{...raw(3, null, 0), title: 'Renamed'}, raw(8, null, 1)]});

      expect(visibleIds()).toEqual([[3, 4]]);
      expect(loaded(3).title).toBe('Renamed');
    }));

    it('sends the tag filter, inserts nothing live and drops a loaded ticket that stops matching', fakeAsync(() => {
      ticketService.list.calls.reset();
      ticketService.list.and.returnValue(page([{...ticketSummary(3, null, 0), tagIds: [31]}, {...ticketSummary(4, null, 1), tagIds: [30, 31]}], false));
      component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set<number | 'none'>([31]), columnIds: new Set([null])});
      flushMicrotasks();

      expect(ticketService.list).toHaveBeenCalledWith('abc', 9, {status: 'backlog', search: '', assigneeIds: [], tagIds: [31], offset: 0});

      channel.handleMessage({type: 'tickets_upserted', tickets: [{...raw(3, null, 0), tag_ids: []}, {...raw(4, null, 1), tag_ids: [31]}, {...raw(8, null, 1), tag_ids: [31]}]});

      expect(visibleIds()).toEqual([[4]]);
      expect(component.isFiltering).toBeTrue();
    }));

    it('keeps an untagged ticket while filtering by No tags', fakeAsync(() => {
      ticketService.list.and.returnValue(page([ticketSummary(3, null, 0)], false));
      component.handleFiltersChange({assigneeIds: new Set(), tagIds: new Set<number | 'none'>(['none']), columnIds: new Set([null])});
      flushMicrotasks();

      channel.handleMessage({type: 'tickets_upserted', tickets: [{...raw(3, null, 0), title: 'Renamed'}]});

      expect(loaded(3).title).toBe('Renamed');
    }));
  });

  it('reloads the groups when the board loads again', fakeAsync(() => {
    ticketService.list.calls.reset();

    state.boardLoaded$.next();
    flushMicrotasks();

    expect(ticketService.list).toHaveBeenCalledTimes(3);
  }));
});

describe('board tab routes', () => {
  @Component({template: ''})
  class StubComponent {
  }

  function stubbed(route: Route): Route {
    return route.component ? {...route, component: StubComponent, children: route.children?.map(stubbed)} : route;
  }

  beforeEach(() => {
    const board = dashboardRoutes.find((route) => route.path === `${AppRoutes.BOARDS}/:id`)!;
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
