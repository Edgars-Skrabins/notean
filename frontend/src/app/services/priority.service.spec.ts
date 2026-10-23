import {AxiosError, AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {mapBoardPriority, PriorityService} from "./priority.service";

const raw = {id: 3, name: 'High', color: 'orange' as const, position: 3, ticket_count: 4};

describe('mapBoardPriority', () => {
  it('maps snake_case fields', () => {
    expect(mapBoardPriority(raw)).toEqual({id: 3, name: 'High', color: 'orange', position: 3, ticketCount: 4});
  });
});

describe('PriorityService', () => {
  const service = new PriorityService();
  const url = '/teams/abc/boards/9/priorities';

  it('creates a priority and maps it', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {priority: raw}}));

    const response = await service.create('abc', 9, 'High', 'orange');

    expect(post).toHaveBeenCalledWith(url, {priority: {name: 'High', color: 'orange'}});
    expect(response.success && response.priority.ticketCount).toBe(4);
  });

  it('updates a priority and returns all of the board priorities', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {priorities: [raw]}}));

    const response = await service.update('abc', 9, 3, {position: 0});

    expect(patch).toHaveBeenCalledWith(`${url}/3`, {priority: {position: 0}});
    expect(response.success && response.priorities.map((priority) => priority.name)).toEqual(['High']);
  });

  it('deletes a priority and returns the remaining ones', async () => {
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {priorities: []}}));

    const response = await service.delete('abc', 9, 3);

    expect(remove).toHaveBeenCalledWith(`${url}/3`);
    expect(response).toEqual({success: true, priorities: []});
  });

  it('returns the error code when a name is taken', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 409, data: {code: 'PRIORITY_NAME_TAKEN'}} as AxiosResponse);
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(failure));

    const response = await service.update('abc', 9, 3, {name: 'Low'});

    expect(response).toEqual({success: false, code: 'PRIORITY_NAME_TAKEN'});
  });
});
