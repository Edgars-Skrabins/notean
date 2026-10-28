import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {KanbanTabComponent} from "./kanban-tab.component";
import {ColumnService} from "@services/column.service";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {TicketSummary} from "@models/ticket.model";
import {PHRASES} from "@config/phrases";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, ticketDetail} from "../../../testing/boardFixtures";
import {trashServiceStub} from "../../../testing/trashServiceStub";

function dropEvent(previousData: TicketSummary[], data: TicketSummary[], previousIndex: number, currentIndex: number): CdkDragDrop<TicketSummary[]> {
  const container = {data};
  const previousContainer = previousData === data ? container : {data: previousData};
  return {container, previousContainer, previousIndex, currentIndex} as unknown as CdkDragDrop<TicketSummary[]>;
}

describe('KanbanTabComponent', () => {
  let component: KanbanTabComponent;
  let state: BoardPageStateService;
  let ticketService: jasmine.SpyObj<TicketService>;
  let columnService: jasmine.SpyObj<ColumnService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  const route = {} as ActivatedRoute;

  beforeEach(() => {
    state = createBoardState();
    ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['moveTicket', 'moveToBacklog', 'deleteTicket', 'createTicket']);
    columnService = jasmine.createSpyObj<ColumnService>('ColumnService', ['renameColumn', 'deleteColumn', 'createColumn']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new KanbanTabComponent(route, router, state, columnService, ticketService, favoriteService, toastService, trashServiceStub().service);
  });

  function columnIds(index: number): number[] {
    return state.board!.columns[index].tickets.map((ticket) => ticket.id);
  }

  it('opens a ticket in the popup route under the tab', () => {
    component.handleOpenTicket(state.board!.columns[0].tickets[0]);

    expect(router.navigate).toHaveBeenCalledWith(['tickets', 1], {relativeTo: route});
  });

  it('does nothing when a ticket is dropped where it started', () => {
    const tickets = state.board!.columns[0].tickets;

    component.handleTicketDropped(dropEvent(tickets, tickets, 1, 1), state.board!.columns[0]);

    expect(ticketService.moveTicket).not.toHaveBeenCalled();
  });

  it('moves a ticket to another column and sends the target column and position', () => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(1, 11, 0)}));
    const [todo, done] = state.board!.columns;

    component.handleTicketDropped(dropEvent(todo.tickets, done.tickets, 0, 0), done);

    expect(columnIds(0)).toEqual([2]);
    expect(columnIds(1)).toEqual([1]);
    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 1, {columnId: 11, position: 0});
  });

  it('reloads the board and shows the error when a drop fails', fakeAsync(() => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: false, code: 'COLUMN_NOT_FOUND'}));
    const reload = spyOn(state, 'reload').and.returnValue(Promise.resolve());
    const todo = state.board!.columns[0];

    component.handleTicketDropped(dropEvent(todo.tickets, todo.tickets, 0, 1), todo);
    flushMicrotasks();

    expect(component.alertMessage).toBe('ERRORS.BOARDS.COLUMN_NOT_FOUND');
    expect(reload).toHaveBeenCalled();
  }));

  it('moves a ticket to the bottom of the backlog', fakeAsync(() => {
    ticketService.moveToBacklog.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(1, null, 2)}));

    component.handleMoveToBacklog(state.board!.columns[0].tickets[0]);
    flushMicrotasks();

    expect(columnIds(0)).toEqual([2]);
    expect(state.board!.backlog.map((ticket) => ticket.id)).toEqual([3, 4, 1]);
  }));

  it('shows a toast when moving to the backlog fails', fakeAsync(() => {
    ticketService.moveToBacklog.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));

    component.handleMoveToBacklog(state.board!.columns[0].tickets[0]);
    flushMicrotasks();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
    expect(columnIds(0)).toEqual([1, 2]);
  }));

  it('creates a ticket at the bottom of the chosen column', fakeAsync(() => {
    ticketService.createTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(7, 10, 2)}));
    component.handleAddTicket(state.board!.columns[0]);

    component.handleCreateTicketConfirmed({title: 'New'});
    flushMicrotasks();

    expect(ticketService.createTicket).toHaveBeenCalledWith('abc', 9, 'New', 10);
    expect(columnIds(0)).toEqual([1, 2, 7]);
  }));

  it('deletes a ticket and forgets its favorite', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));
    const todo = state.board!.columns[0];
    component.requestDeleteTicket(todo.tickets[1], todo);

    component.handleConfirmDeleteTicket();
    flushMicrotasks();

    expect(columnIds(0)).toEqual([1]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 2);
  }));

  it('keeps the ticket and shows the error when deleting fails', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: false, code: 'TICKET_NOT_FOUND'}));
    const todo = state.board!.columns[0];
    component.requestDeleteTicket(todo.tickets[1], todo);

    component.handleConfirmDeleteTicket();
    flushMicrotasks();

    expect(columnIds(0)).toEqual([1, 2]);
    expect(component.alertMessage).toBe('ERRORS.TICKETS.TICKET_NOT_FOUND');
  }));

  it('deletes a column and forgets the favorites of its tickets', fakeAsync(() => {
    columnService.deleteColumn.and.returnValue(Promise.resolve({success: true, trashEntryIds: [1]}));
    component.requestDeleteColumn(state.board!.columns[0]);

    component.handleConfirmDeleteColumn();
    flushMicrotasks();

    expect(state.board!.columns.map((column) => column.id)).toEqual([11]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 1);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 2);
  }));
});
