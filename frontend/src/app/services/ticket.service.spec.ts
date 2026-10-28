import {AxiosError, AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {mapTicketDetail, TicketService} from "./ticket.service";

const baseRaw = {
  id: 1,
  title: 'My Ticket',
  position: 2,
  description: 'Details',
  board_id: 9,
  column_id: 3,
  lock_version: 1,
  creator: {id: 4, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}},
  assignees: [],
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
      priorityId: null,
      lockVersion: 1,
      assignees: [],
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

  it('sends a priority change as priority_id, including null to clear it', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {ticket: {...baseRaw, priority_id: 4}}}));

    const response = await service.updateTicket('abc', 9, 1, {priorityId: 4});
    await service.updateTicket('abc', 9, 1, {priorityId: null});
    await service.updateTicket('abc', 9, 1, {title: 'Renamed'});

    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {priority_id: 4}});
    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {priority_id: null}});
    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {title: 'Renamed'}});
    expect(response.success && response.ticket.priorityId).toBe(4);
  });

  it('sends the version with a title or description change', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));

    await service.updateTicket('abc', 9, 1, {description: 'Steps', lockVersion: 1});

    expect(patch).toHaveBeenCalledWith(`${url}/1`, {ticket: {description: 'Steps', lock_version: 1}});
  });

  it('returns the mapped latest ticket when an update conflicts', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 409, data: {code: 'EDIT_CONFLICT', ticket: {...baseRaw, title: 'Theirs', lock_version: 2}}} as AxiosResponse);
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(failure));

    const response = await service.updateTicket('abc', 9, 1, {title: 'Mine', lockVersion: 1});

    expect(response.success).toBeFalse();
    expect('latest' in response && [response.latest.title, response.latest.lockVersion]).toEqual(['Theirs', 2]);
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

  it('adds and removes assignees', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {ticket: baseRaw}}));

    await service.addAssignee('abc', 9, 1, 5);
    await service.removeAssignee('abc', 9, 1, 5);

    expect(post).toHaveBeenCalledWith(`${url}/1/assignees`, {assignee: {user_id: 5}});
    expect(remove).toHaveBeenCalledWith(`${url}/1/assignees/5`);
  });

  it('lists one status group with its filters and maps the tickets', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {tickets: [baseRaw], has_more: true}}));

    const response = await service.list('abc', 9, {status: 3, search: 'bug', assigneeIds: [5, 'none'], offset: 50});
    await service.list('abc', 9, {status: 'backlog', assigneeIds: []});

    expect(get).toHaveBeenCalledWith(url, {params: {status: 3, search: 'bug', assignee_ids: [5, 'none'], offset: 50}});
    expect(get).toHaveBeenCalledWith(url, {params: {status: 'backlog', search: undefined, assignee_ids: undefined, offset: undefined}});
    expect(response.success && response.tickets.map((ticket) => [ticket.id, ticket.columnId])).toEqual([[1, 3]]);
    expect(response.success && response.hasMore).toBeTrue();
  });

  it('sends each bulk action with the ticket ids and maps the returned tickets', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {tickets: [baseRaw]}}));

    const response = await service.bulkUpdate('abc', 9, [1, 2], {columnId: 3});
    await service.bulkUpdate('abc', 9, [1], {toBacklog: true});
    await service.bulkUpdate('abc', 9, [1], {addAssigneeId: 5});
    await service.bulkUpdate('abc', 9, [1], {removeAssigneeId: 5});

    expect(patch).toHaveBeenCalledWith(`${url}/bulk`, {bulk: {ticket_ids: [1, 2], column_id: 3}});
    expect(patch).toHaveBeenCalledWith(`${url}/bulk`, {bulk: {ticket_ids: [1], to_backlog: true}});
    expect(patch).toHaveBeenCalledWith(`${url}/bulk`, {bulk: {ticket_ids: [1], add_assignee_id: 5}});
    expect(patch).toHaveBeenCalledWith(`${url}/bulk`, {bulk: {ticket_ids: [1], remove_assignee_id: 5}});
    expect(response.success && response.tickets.map((ticket) => [ticket.id, ticket.columnId, ticket.createdAt]))
      .toEqual([[1, 3, '2024-01-01T00:00:00Z']]);
  });

  it('returns the error code when a bulk action fails', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 404, data: {code: 'TICKET_NOT_FOUND'}} as AxiosResponse);
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(failure));

    const response = await service.bulkUpdate('abc', 9, [1], {columnId: 3});

    expect(response).toEqual({success: false, code: 'TICKET_NOT_FOUND'});
  });

  it('bulk deletes tickets by id and returns their trash entries', async () => {
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {trash_entry_ids: [5, 6]}}));

    const response = await service.bulkDelete('abc', 9, [1, 2]);

    expect(remove).toHaveBeenCalledWith(`${url}/bulk`, {data: {bulk: {ticket_ids: [1, 2]}}});
    expect(response).toEqual({success: true, trashEntryIds: [5, 6]});
  });
});
