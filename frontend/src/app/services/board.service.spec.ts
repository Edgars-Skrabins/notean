import {mapBoardColumn, mapBoardDetail, mapBoardOverview, mapBoardSummary, mapBoardUser, mapTicketSummary} from "./board.service";

const rawTicket = (id: number, title: string, position: number, columnId: number | null = 3) => ({
  id,
  title,
  position,
  column_id: columnId,
  assignees: [],
  updated_at: '2024-01-02T00:00:00Z',
});

const ticket = (id: number, title: string, position: number, columnId: number | null = 3) => ({
  id,
  title,
  position,
  columnId,
  assignees: [],
  updatedAt: '2024-01-02T00:00:00Z',
});

const rawCreator = {id: 2, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}};

describe('mapBoardUser', () => {
  it('maps id, nickname and avatar', () => {
    const result = mapBoardUser({id: 1, nickname: 'alice', avatar: {color: 'blue', image_url: '/img'}});

    expect(result).toEqual({id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: '/img'}});
  });
});

describe('mapTicketSummary', () => {
  it('maps id, title, position, column and update time', () => {
    expect(mapTicketSummary(rawTicket(1, 'My Ticket', 2, null))).toEqual(ticket(1, 'My Ticket', 2, null));
  });

  it('maps assignees with their avatars', () => {
    const result = mapTicketSummary({...rawTicket(1, 'My Ticket', 2), assignees: [rawCreator]});

    expect(result.assignees).toEqual([{id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}}]);
  });
});

describe('mapBoardColumn', () => {
  it('defaults tickets to an empty array when missing', () => {
    const result = mapBoardColumn({id: 1, title: 'To do', position: 0});

    expect(result).toEqual({id: 1, title: 'To do', position: 0, tickets: []});
  });

  it('maps tickets through mapTicketSummary', () => {
    const result = mapBoardColumn({id: 3, title: 'To do', position: 0, tickets: [rawTicket(2, 'First', 0), rawTicket(3, 'Second', 1)]});

    expect(result.tickets).toEqual([ticket(2, 'First', 0), ticket(3, 'Second', 1)]);
  });
});

describe('mapBoardSummary', () => {
  it('maps snake_case fields and nests the creator', () => {
    const result = mapBoardSummary({
      id: 1,
      title: 'My Board',
      creator: rawCreator,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual({
      id: 1,
      title: 'My Board',
      creator: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });
});

describe('mapBoardDetail', () => {
  const raw = {
    id: 1,
    title: 'My Board',
    creator: rawCreator,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    columns: [
      {id: 3, title: 'To do', position: 0, tickets: [rawTicket(4, 'First', 0)]},
      {id: 5, title: 'Done', position: 1},
    ],
  };

  it('maps columns through mapBoardColumn', () => {
    expect(mapBoardDetail(raw).columns).toEqual([
      {id: 3, title: 'To do', position: 0, tickets: [ticket(4, 'First', 0)]},
      {id: 5, title: 'Done', position: 1, tickets: []},
    ]);
  });

  it('maps the backlog and defaults it to an empty list', () => {
    expect(mapBoardDetail(raw).backlog).toEqual([]);
    expect(mapBoardDetail({...raw, backlog: [rawTicket(6, 'Idea', 0, null)]}).backlog).toEqual([ticket(6, 'Idea', 0, null)]);
  });
});

describe('mapBoardOverview', () => {
  it('maps counts, columns and recent tickets', () => {
    const result = mapBoardOverview({
      total_tickets: 3,
      board_tickets: 2,
      backlog_tickets: 1,
      columns: [{id: 3, title: 'To do', ticket_count: 2}],
      created_last_7_days: 1,
      updated_last_7_days: 2,
      recent_tickets: [{id: 4, title: 'Bug', column_id: null, column_title: null, updated_at: '2024-01-02T00:00:00Z'}],
      assignees: [{user: rawCreator, ticket_count: 2}, {user: null, ticket_count: 1}],
    });

    expect(result).toEqual({
      totalTickets: 3,
      boardTickets: 2,
      backlogTickets: 1,
      columns: [{id: 3, title: 'To do', ticketCount: 2}],
      createdLast7Days: 1,
      updatedLast7Days: 2,
      recentTickets: [{id: 4, title: 'Bug', columnId: null, columnTitle: null, updatedAt: '2024-01-02T00:00:00Z'}],
      assignees: [{user: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}}, ticketCount: 2}, {user: null, ticketCount: 1}],
    });
  });
});
