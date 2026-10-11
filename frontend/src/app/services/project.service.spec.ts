import {AxiosError} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {mapProjectDetail, ProjectService} from "./project.service";

const rawProject = {
  id: 1,
  name: 'Game',
  description: 'Fun',
  owner: {id: 2, nickname: 'alice', avatar: {color: 'red' as const, image_url: null}},
  member_count: 2,
  can_manage: true,
  members: [{id: 3, nickname: 'bob', avatar: {color: 'blue' as const, image_url: null}}],
  created_at: '2026-10-01T00:00:00Z',
};

describe('mapProjectDetail', () => {
  it('maps the summary, members and creation time', () => {
    expect(mapProjectDetail(rawProject)).toEqual({
      id: 1,
      name: 'Game',
      description: 'Fun',
      owner: {id: 2, nickname: 'alice', avatar: {color: 'red', imageUrl: null}},
      memberCount: 2,
      canManage: true,
      members: [{id: 3, nickname: 'bob', avatar: {color: 'blue', imageUrl: null}}],
      createdAt: '2026-10-01T00:00:00Z',
    });
  });
});

describe('ProjectService', () => {
  const service = new ProjectService();
  const params = {name: 'Game', description: 'Fun', ownerUserId: 2, memberIds: [3]};

  it('sends snake_case params on create and update', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {project: rawProject}}));
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {project: rawProject}}));
    const raw = {project: {name: 'Game', description: 'Fun', owner_user_id: 2, member_ids: [3]}};

    await service.createProject('abc', params);
    await service.updateProject('abc', 1, params);

    expect(post).toHaveBeenCalledWith('/teams/abc/projects', raw);
    expect(patch).toHaveBeenCalledWith('/teams/abc/projects/1', raw);
  });

  it('sends the mode and typed name when deleting', async () => {
    const remove = spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {}}));

    await service.deleteProject('abc', 1, 'delete_items', 'Game');

    expect(remove).toHaveBeenCalledWith('/teams/abc/projects/1', {data: {project: {mode: 'delete_items', confirm_name: 'Game'}}});
  });

  it('returns PROJECT_NAME_TAKEN from the server', async () => {
    const error = new AxiosError('Request failed');
    error.response = {data: {code: 'PROJECT_NAME_TAKEN'}, status: 422, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(error));

    expect(await service.createProject('abc', params)).toEqual({success: false, code: 'PROJECT_NAME_TAKEN'});
  });
});
