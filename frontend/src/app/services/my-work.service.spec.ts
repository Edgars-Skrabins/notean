import {axiosInstance} from "@config/axiosConfig";
import {groupMyWork, mapMyWorkTicket, MyWorkService} from "./my-work.service";
import {MyWorkTicket} from "@models/my-work.model";

function ticket(id: number, boardId: number): MyWorkTicket {
  return {id, title: `T${id}`, boardId, boardTitle: `Board ${boardId}`, columnId: null, columnTitle: null, assignees: [], updatedAt: ''};
}

describe('mapMyWorkTicket', () => {
  it('maps snake_case fields and assignees', () => {
    expect(mapMyWorkTicket({
      id: 1,
      title: 'Bug',
      board_id: 2,
      board_title: 'Sprint',
      column_id: null,
      column_title: null,
      assignees: [{id: 3, nickname: 'bob', avatar: {color: 'red', image_url: null}}],
      updated_at: '2026-10-01T00:00:00Z',
    })).toEqual({
      id: 1,
      title: 'Bug',
      boardId: 2,
      boardTitle: 'Sprint',
      columnId: null,
      columnTitle: null,
      assignees: [{id: 3, nickname: 'bob', avatar: {color: 'red', imageUrl: null}}],
      updatedAt: '2026-10-01T00:00:00Z',
    });
  });
});

describe('groupMyWork', () => {
  it('groups by board, keeping the order tickets arrive in', () => {
    const groups = groupMyWork([ticket(1, 5), ticket(2, 7), ticket(3, 5)]);

    expect(groups.map((group) => [group.boardId, group.tickets.map((item) => item.id)])).toEqual([[5, [1, 3]], [7, [2]]]);
    expect(groups[0].boardTitle).toBe('Board 5');
  });

  it('returns no groups for no tickets', () => {
    expect(groupMyWork([])).toEqual([]);
  });
});

describe('MyWorkService', () => {
  it('requests the team my_work endpoint', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {tickets: []}}));

    const response = await new MyWorkService().listMyWork('abc');
    await new MyWorkService().listMyWork('abc', 4);

    expect(get).toHaveBeenCalledWith('/teams/abc/my_work', undefined);
    expect(get).toHaveBeenCalledWith('/teams/abc/my_work', {params: {project_id: 4}});
    expect(response).toEqual({success: true, tickets: []});
  });
});
