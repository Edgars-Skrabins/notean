import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {BacklogTabComponent} from "./backlog-tab.component";
import {TicketService} from "@services/ticket.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {TicketSummary} from "@models/ticket.model";
import {PHRASES} from "@config/phrases";
import {BoardPageStateService} from "../board-page/board-page-state.service";
import {createBoardState, ticketDetail} from "../../../testing/boardFixtures";

describe('BacklogTabComponent', () => {
  let component: BacklogTabComponent;
  let state: BoardPageStateService;
  let ticketService: jasmine.SpyObj<TicketService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    state = createBoardState();
    ticketService = jasmine.createSpyObj<TicketService>('TicketService', ['createTicket', 'reorderBacklog', 'moveTicket', 'deleteTicket']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    component = new BacklogTabComponent({} as ActivatedRoute, jasmine.createSpyObj<Router>('Router', ['navigate']), state, ticketService, favoriteService, toastService);
  });

  function backlogIds(): number[] {
    return component.backlog.map((ticket) => ticket.id);
  }

  function drop(previousIndex: number, currentIndex: number): CdkDragDrop<TicketSummary[]> {
    return {previousIndex, currentIndex} as CdkDragDrop<TicketSummary[]>;
  }

  it('creates a ticket at the bottom and keeps the field open and empty', fakeAsync(() => {
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

  it('keeps the field open on blur while it has text', () => {
    component.handleStartCreate();
    component.newTicketTitle = 'Draft';

    component.handleCloseCreate();

    expect(component.isCreating).toBeTrue();
  });

  it('reorders the backlog and saves the new position', () => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(4, null, 0)}));

    component.handleDropped(drop(1, 0));

    expect(backlogIds()).toEqual([4, 3]);
    expect(ticketService.reorderBacklog).toHaveBeenCalledWith('abc', 9, 4, 0);
  });

  it('reverts the order and shows a toast when saving it fails', fakeAsync(() => {
    ticketService.reorderBacklog.and.returnValue(Promise.resolve({success: false, code: 'TICKET_UPDATE_FAILED'}));

    component.handleDropped(drop(1, 0));
    flushMicrotasks();

    expect(backlogIds()).toEqual([3, 4]);
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.TICKET_MOVE_FAILED});
  }));

  it('moves a ticket to the chosen column', fakeAsync(() => {
    ticketService.moveTicket.and.returnValue(Promise.resolve({success: true, ticket: ticketDetail(3, 11, 0)}));
    component.handleMoveRequested(component.backlog[0]);

    component.handleMoveConfirmed({columnId: 11});
    flushMicrotasks();

    expect(ticketService.moveTicket).toHaveBeenCalledWith('abc', 9, 3, {columnId: 11});
    expect(backlogIds()).toEqual([4]);
    expect(state.board!.columns[1].tickets.map((ticket) => ticket.id)).toEqual([3]);
    expect(component.ticketToMove).toBeNull();
  }));

  it('deletes a ticket and forgets its favorite', fakeAsync(() => {
    ticketService.deleteTicket.and.returnValue(Promise.resolve({success: true}));
    component.requestDelete(component.backlog[1]);

    component.handleConfirmDelete();
    flushMicrotasks();

    expect(backlogIds()).toEqual([3]);
    expect(favoriteService.forgetItem).toHaveBeenCalledWith('Ticket', 4);
  }));
});
