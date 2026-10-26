import {Subscription} from '@rails/actioncable';
import {BoardChannelService} from "./board-channel.service";
import {CableService} from "@services/cable.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {RawTicketSummary} from "@services/board.service";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../app/app-routes.enum";
import {BoardPageStateService} from "@pages/dashboard/board-page/board-page-state.service";
import {boardDetail, createBoardState, ticketSummary} from "../testing/boardFixtures";

function rawTicket(id: number, columnId: number | null, position: number, changes: Partial<RawTicketSummary> = {}): RawTicketSummary {
  const ticket = ticketSummary(id, columnId, position);
  return {
    id,
    title: ticket.title,
    position,
    column_id: columnId,
    priority_id: null,
    lock_version: ticket.lockVersion,
    assignees: [],
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
    ...changes,
  };
}

describe('BoardChannelService', () => {
  let state: BoardPageStateService;
  let cableService: jasmine.SpyObj<CableService>;
  let subscription: jasmine.SpyObj<Subscription>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let service: BoardChannelService;

  function ids(columnId: number | null) {
    return state.ticketsByStatus().find((group) => group.status.columnId === columnId)!.tickets.map((ticket) => ticket.id);
  }

  beforeEach(() => {
    state = createBoardState();
    subscription = jasmine.createSpyObj<Subscription>('Subscription', ['unsubscribe', 'perform']);
    cableService = jasmine.createSpyObj<CableService>('CableService', ['subscribe']);
    cableService.subscribe.and.returnValue(subscription);
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    service = new BoardChannelService(cableService, state, navigationService, toastService);
  });

  it('subscribes to the board through the shared cable and only unsubscribes on disconnect', () => {
    service.connect(9);
    service.disconnect();

    expect(cableService.subscribe).toHaveBeenCalledOnceWith({channel: 'BoardChannel', board_id: 9}, jasmine.any(Object));
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('tickets_upserted updates tickets, places moved ones and re-sorts the affected groups by position', async () => {
    await service.handleMessage({
      type: 'tickets_upserted',
      tickets: [rawTicket(4, 10, 0, {title: 'Moved'}), rawTicket(1, 10, 1), rawTicket(2, 10, 2)],
    });

    expect(ids(10)).toEqual([4, 1, 2]);
    expect(ids(null)).toEqual([3]);
    expect(state.findTicket(4)?.title).toBe('Moved');
  });

  it('tickets_upserted passes on the descriptions it carries', async () => {
    const changes: Map<number, string>[] = [];
    state.remoteChanges$.subscribe((descriptions) => changes.push(descriptions));

    await service.handleMessage({type: 'tickets_upserted', tickets: [{...rawTicket(1, 10, 0), description: 'New details'}, rawTicket(2, 10, 1)]});

    expect(changes).toEqual([new Map([[1, 'New details']])]);
    expect(state.findTicket(1)).toEqual(ticketSummary(1, 10, 0));
  });

  it('the echo of my own change leaves the board as it was', async () => {
    const before = JSON.stringify(state.board);

    await service.handleMessage({type: 'tickets_upserted', tickets: [rawTicket(1, 10, 0), rawTicket(2, 10, 1)]});
    await service.handleMessage({type: 'tickets_removed', ticket_ids: [99]});

    expect(JSON.stringify(state.board)).toBe(before);
  });

  it('tickets_removed removes the tickets', async () => {
    await service.handleMessage({type: 'tickets_removed', ticket_ids: [1, 3]});

    expect(ids(10)).toEqual([2]);
    expect(ids(null)).toEqual([4]);
  });

  it('columns_changed replaces the columns', async () => {
    await service.handleMessage({type: 'columns_changed', columns: [{id: 10, title: 'Next', position: 0}]});

    expect(state.statuses.map((status) => status.title)).toEqual(['BACKLOG', 'Next']);
    expect(ids(10)).toEqual([1, 2]);
  });

  it('priorities_changed replaces the priorities and applies the cleared tickets', async () => {
    state.findTicket(1)!.priorityId = 21;

    await service.handleMessage({
      type: 'priorities_changed',
      priorities: [{id: 20, name: 'Low', color: 'blue', position: 0, ticket_count: 0}],
      tickets: [rawTicket(1, 10, 0)],
    });

    expect(state.board!.priorities.map((priority) => priority.id)).toEqual([20]);
    expect(state.findTicket(1)?.priorityId).toBeNull();
  });

  it('board_updated sets the title and project', async () => {
    await service.handleMessage({type: 'board_updated', board: {id: 9, title: 'Sprint 13', project_id: 4}});

    expect(state.board!.title).toBe('Sprint 13');
    expect(state.board!.projectId).toBe(4);
  });

  it('board_deleted goes home with a toast', async () => {
    service.connect(9);

    await service.handleMessage({type: 'board_deleted'});

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.INFO, message: PHRASES.BOARD_WAS_DELETED});
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('access_changed reloads and goes home with a toast when the board is no longer found', async () => {
    spyOn(state, 'reload').and.callFake(async () => {
      state.board = null;
      state.errorCode = 'BOARD_NOT_FOUND';
    });

    await service.handleMessage({type: 'access_changed'});

    expect(state.reload).toHaveBeenCalled();
    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.INFO, message: PHRASES.BOARD_ACCESS_LOST});
  });

  it('access_changed keeps the reloaded board when it is still visible', async () => {
    spyOn(state, 'reload').and.callFake(async () => {
      state.board = {...boardDetail(), projectId: 4};
      state.errorCode = null;
    });

    await service.handleMessage({type: 'access_changed'});

    expect(state.board!.projectId).toBe(4);
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });
});
