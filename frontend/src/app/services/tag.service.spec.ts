import {AxiosError, AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {mapTag, TagService} from "./tag.service";

const raw = {id: 3, name: 'bug', color: 'red' as const, ticket_count: 4};

describe('mapTag', () => {
  it('maps snake_case fields', () => {
    expect(mapTag(raw)).toEqual({id: 3, name: 'bug', color: 'red', ticketCount: 4});
  });
});

describe('TagService', () => {
  const service = new TagService();
  const url = '/teams/abc/boards/9/tags';
  const ticketsUrl = '/teams/abc/boards/9/tickets/1/tags';
  const rawTicket = {
    id: 1, title: 'Fix', position: 0, column_id: null, lock_version: 0, assignees: [], tag_ids: [3],
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', description: null, board_id: 9,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'red', image_url: null}},
  };

  it('creates a tag, leaving the colour to the server when none is given', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {tag: raw}}));

    const response = await service.create('abc', 9, 'bug');

    expect(post).toHaveBeenCalledWith(url, {tag: {name: 'bug', color: undefined}});
    expect(response.success && response.tag.ticketCount).toBe(4);
  });

  it('updates and removes a tag, returning all of the board tags', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {tags: [raw]}}));
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {tags: []}}));

    const updated = await service.update('abc', 9, 3, {color: 'teal'});
    const removed = await service.remove('abc', 9, 3);

    expect(patch).toHaveBeenCalledWith(`${url}/3`, {tag: {color: 'teal'}});
    expect(remove).toHaveBeenCalledWith(`${url}/3`);
    expect(updated.success && updated.tags.map((tag) => tag.name)).toEqual(['bug']);
    expect(removed).toEqual({success: true, tags: []});
  });

  it('adds a tag to a ticket and removes it, mapping the ticket', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {ticket: rawTicket}}));
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {ticket: {...rawTicket, tag_ids: []}}}));

    const added = await service.addToTicket('abc', 9, 1, 3);
    const removed = await service.removeFromTicket('abc', 9, 1, 3);

    expect(post).toHaveBeenCalledWith(ticketsUrl, {tag: {tag_id: 3}});
    expect(remove).toHaveBeenCalledWith(`${ticketsUrl}/3`);
    expect(added.success && added.ticket.tagIds).toEqual([3]);
    expect(removed.success && removed.ticket.tagIds).toEqual([]);
  });

  it('returns the error code when a ticket has too many tags', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 422, data: {code: 'TICKET_TAG_LIMIT_REACHED'}} as AxiosResponse);
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(failure));

    const response = await service.addToTicket('abc', 9, 1, 3);

    expect(response).toEqual({success: false, code: 'TICKET_TAG_LIMIT_REACHED'});
  });
});
