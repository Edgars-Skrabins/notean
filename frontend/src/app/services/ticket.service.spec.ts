import {axiosInstance} from "@config/axiosConfig";
import {mapTicketDetail, TicketService} from "./ticket.service";

const baseRaw = {
  id: 1,
  title: 'My Ticket',
  position: 2,
  description: 'Details',
  board_id: 9,
  column_id: 3,
  creator: {id: 4, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

describe('mapTicketDetail', () => {
  it('maps snake_case fields and nests the creator', () => {
    expect(mapTicketDetail(baseRaw)).toEqual({
      id: 1,
      title: 'My Ticket',
      position: 2,
      description: 'Details',
      boardId: 9,
      columnId: 3,
      creator: {id: 4, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });

  it('defaults description to an empty string when null', () => {
    expect(mapTicketDetail({...baseRaw, description: null}).description).toBe('');
  });
});

describe('TicketService', () => {
  const service = new TicketService();
  const url = '/teams/abc/boards/9/tickets';

  it('creates a ticket in a column or in the backlog', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));

    await service.createTicket('abc', 9, 'Bug', 3);
    await service.createTicket('abc', 9, 'Idea', null);

    expect(post).toHaveBeenCalledWith(url, {ticket: {title: 'Bug', column_id: 3}});
    expect(post).toHaveBeenCalledWith(url, {ticket: {title: 'Idea', column_id: null}});
  });

  it('sends the move, backlog and reorder changes', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));

    await service.moveTicket('abc', 9, 1, {columnId: 3});
    await service.moveToBacklog('abc', 9, 1);
    await service.reorderBacklog('abc', 9, 1, 0);

    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {column_id: 3, position: undefined}});
    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {to_backlog: true, position: undefined}});
    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {position: 0}});
  });

  it('returns the mapped ticket', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));

    const response = await service.getTicket('abc', 9, 1);

    expect(response.success && response.ticket.boardId).toBe(9);
  });
});
