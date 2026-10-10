import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {CdkDragDrop} from "@angular/cdk/drag-drop";
import {KanbanBoardComponent} from "./kanban-board.component";
import {BoardService} from "@services/board.service";
import {ColumnService} from "@services/column.service";
import {CardService} from "@services/card.service";
import {TeamService} from "@services/team.service";
import {NavigationService} from "@services/navigation.service";
import {BoardColumn} from "@models/board.model";
import {CardDetail, CardSummary} from "@models/card.model";

function createComponent(cardService: CardService) {
  const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam']);
  teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});

  return new KanbanBoardComponent(
    {} as ActivatedRoute,
    {} as Router,
    {} as BoardService,
    {} as ColumnService,
    cardService,
    teamService,
    {} as NavigationService
  );
}

function createDropEvent(
  previousData: CardSummary[],
  data: CardSummary[],
  previousIndex: number,
  currentIndex: number
): CdkDragDrop<CardSummary[]> {
  const container = {data};
  const previousContainer = previousData === data ? container : {data: previousData};

  return {container, previousContainer, previousIndex, currentIndex} as unknown as CdkDragDrop<CardSummary[]>;
}

describe('KanbanBoardComponent.handleCardDropped', () => {
  let component: KanbanBoardComponent;
  let cardService: jasmine.SpyObj<CardService>;
  let loadBoard: jasmine.Spy;
  let first: CardSummary;
  let second: CardSummary;
  let third: CardSummary;

  beforeEach(() => {
    cardService = jasmine.createSpyObj('CardService', ['moveCard']);
    cardService.moveCard.and.returnValue(Promise.resolve({success: true, card: {} as CardDetail}));
    component = createComponent(cardService);
    loadBoard = spyOn<any>(component, 'loadBoard');

    first = {id: 1, title: 'First', position: 0};
    second = {id: 2, title: 'Second', position: 1};
    third = {id: 3, title: 'Third', position: 0};
  });

  it('does nothing when the card is dropped where it started', () => {
    const cards = [first, second];
    const column: BoardColumn = {id: 10, title: 'To do', position: 0, cards};

    component.handleCardDropped(createDropEvent(cards, cards, 1, 1), column);

    expect(cards).toEqual([first, second]);
    expect(cardService.moveCard).not.toHaveBeenCalled();
  });

  it('reorders within the same column and sends the new position', () => {
    const cards = [first, second];
    const column: BoardColumn = {id: 10, title: 'To do', position: 0, cards};

    component.handleCardDropped(createDropEvent(cards, cards, 0, 1), column);

    expect(cards).toEqual([second, first]);
    expect(cardService.moveCard).toHaveBeenCalledWith('aaa', 0, 1, {columnId: 10, position: 1});
  });

  it('moves the card to another column and sends the target column', () => {
    const source = [first, second];
    const target = [third];
    const column: BoardColumn = {id: 20, title: 'Done', position: 1, cards: target};

    component.handleCardDropped(createDropEvent(source, target, 0, 0), column);

    expect(source).toEqual([second]);
    expect(target).toEqual([first, third]);
    expect(cardService.moveCard).toHaveBeenCalledWith('aaa', 0, 1, {columnId: 20, position: 0});
  });

  it('shows the error and reloads the board when the move fails', fakeAsync(() => {
    cardService.moveCard.and.returnValue(Promise.resolve({success: false, statusMessage: 'Failed'}));
    const cards = [first, second];
    const column: BoardColumn = {id: 10, title: 'To do', position: 0, cards};

    component.handleCardDropped(createDropEvent(cards, cards, 0, 1), column);
    flushMicrotasks();

    expect(component.alertMessage).toBe('Failed');
    expect(loadBoard).toHaveBeenCalled();
  }));

  it('does not reload the board when the move succeeds', fakeAsync(() => {
    const cards = [first, second];
    const column: BoardColumn = {id: 10, title: 'To do', position: 0, cards};

    component.handleCardDropped(createDropEvent(cards, cards, 0, 1), column);
    flushMicrotasks();

    expect(component.alertMessage).toBe('');
    expect(loadBoard).not.toHaveBeenCalled();
  }));
});

describe('KanbanBoardComponent card create and delete', () => {
  let component: KanbanBoardComponent;
  let cardService: jasmine.SpyObj<CardService>;
  let column: BoardColumn;
  let first: CardSummary;
  let second: CardSummary;

  beforeEach(() => {
    cardService = jasmine.createSpyObj('CardService', ['createCard', 'deleteCard']);
    component = createComponent(cardService);

    first = {id: 1, title: 'First', position: 0};
    second = {id: 2, title: 'Second', position: 1};
    column = {id: 10, title: 'To do', position: 0, cards: [first, second]};
  });

  it('handleConfirmDeleteCard does nothing when no card is pending', () => {
    component.handleConfirmDeleteCard();

    expect(cardService.deleteCard).not.toHaveBeenCalled();
  });

  it('handleConfirmDeleteCard removes the card from its column', fakeAsync(() => {
    cardService.deleteCard.and.returnValue(Promise.resolve({success: true}));
    component.requestDeleteCard(first, column);

    component.handleConfirmDeleteCard();
    flushMicrotasks();

    expect(component.cardPendingDeletion).toBeNull();
    expect(cardService.deleteCard).toHaveBeenCalledWith('aaa', 0, 1);
    expect(column.cards).toEqual([second]);
  }));

  it('handleConfirmDeleteCard keeps the card and shows the error when the request fails', fakeAsync(() => {
    cardService.deleteCard.and.returnValue(Promise.resolve({success: false, statusMessage: 'Failed'}));
    component.requestDeleteCard(first, column);

    component.handleConfirmDeleteCard();
    flushMicrotasks();

    expect(component.alertMessage).toBe('Failed');
    expect(column.cards).toEqual([first, second]);
  }));

  it('handleCreateCardConfirmed does nothing when no column is selected', () => {
    component.handleCreateCardConfirmed({title: 'Third'});

    expect(cardService.createCard).not.toHaveBeenCalled();
  });

  it('handleCreateCardConfirmed appends the created card to the column', fakeAsync(() => {
    const created: CardDetail = {
      id: 3,
      title: 'Third',
      position: 2,
      description: '',
      columnId: 10,
      creator: {id: 4, nickname: 'bob'},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    cardService.createCard.and.returnValue(Promise.resolve({success: true, card: created}));
    component.handleAddCard(column);

    component.handleCreateCardConfirmed({title: 'Third'});
    flushMicrotasks();

    expect(component.addCardToColumn).toBeNull();
    expect(cardService.createCard).toHaveBeenCalledWith('aaa', 0, 10, 'Third');
    expect(column.cards).toEqual([first, second, created]);
  }));

  it('handleCreateCardConfirmed shows the error when the request fails', fakeAsync(() => {
    cardService.createCard.and.returnValue(Promise.resolve({success: false, statusMessage: 'Failed'}));
    component.handleAddCard(column);

    component.handleCreateCardConfirmed({title: 'Third'});
    flushMicrotasks();

    expect(component.alertMessage).toBe('Failed');
    expect(column.cards).toEqual([first, second]);
  }));
});
