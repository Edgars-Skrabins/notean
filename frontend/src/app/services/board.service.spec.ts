import {mapBoardColumn, mapBoardDetail, mapBoardSummary, mapBoardUser, mapCardSummary} from "./board.service";

describe('mapBoardUser', () => {
  it('maps id and nickname', () => {
    const result = mapBoardUser({id: 1, nickname: 'alice'});

    expect(result).toEqual({id: 1, nickname: 'alice'});
  });
});

describe('mapCardSummary', () => {
  it('maps id, title and position', () => {
    const result = mapCardSummary({id: 1, title: 'My Card', position: 2});

    expect(result).toEqual({id: 1, title: 'My Card', position: 2});
  });
});

describe('mapBoardColumn', () => {
  it('defaults cards to an empty array when missing', () => {
    const result = mapBoardColumn({id: 1, title: 'To do', position: 0});

    expect(result).toEqual({id: 1, title: 'To do', position: 0, cards: []});
  });

  it('maps cards through mapCardSummary', () => {
    const result = mapBoardColumn({
      id: 1,
      title: 'To do',
      position: 0,
      cards: [{id: 2, title: 'First', position: 0}, {id: 3, title: 'Second', position: 1}],
    });

    expect(result.cards).toEqual([
      {id: 2, title: 'First', position: 0},
      {id: 3, title: 'Second', position: 1},
    ]);
  });
});

describe('mapBoardSummary', () => {
  it('maps snake_case fields and nests the creator', () => {
    const result = mapBoardSummary({
      id: 1,
      title: 'My Board',
      creator: {id: 2, nickname: 'bob'},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual({
      id: 1,
      title: 'My Board',
      creator: {id: 2, nickname: 'bob'},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });
});

describe('mapBoardDetail', () => {
  it('maps columns through mapBoardColumn', () => {
    const result = mapBoardDetail({
      id: 1,
      title: 'My Board',
      creator: {id: 2, nickname: 'bob'},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      columns: [
        {id: 3, title: 'To do', position: 0, cards: [{id: 4, title: 'First', position: 0}]},
        {id: 5, title: 'Done', position: 1},
      ],
    });

    expect(result.columns).toEqual([
      {id: 3, title: 'To do', position: 0, cards: [{id: 4, title: 'First', position: 0}]},
      {id: 5, title: 'Done', position: 1, cards: []},
    ]);
  });
});
