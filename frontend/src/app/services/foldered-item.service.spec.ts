import {AxiosError} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {PageService} from "@services/page.service";
import {DiagramService} from "@services/diagram.service";
import {mapFolderedItemDetail, mapFolderedItemEditingUser, mapFolderedItemSummary, mapFolderedItemUser} from "./foldered-item.service";

describe('mapFolderedItemUser', () => {
  it('maps id, nickname and avatar', () => {
    const result = mapFolderedItemUser({id: 1, nickname: 'alice', avatar: {color: 'blue', image_url: '/img'}});

    expect(result).toEqual({id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: '/img'}});
  });
});

describe('mapFolderedItemEditingUser', () => {
  it('maps id and nickname', () => {
    const result = mapFolderedItemEditingUser({id: 1, nickname: 'alice'});

    expect(result).toEqual({id: 1, nickname: 'alice'});
  });
});

describe('mapFolderedItemSummary', () => {
  it('maps snake_case fields and nests the creator', () => {
    const result = mapFolderedItemSummary({
      id: 1,
      title: 'My Page',
      folder_id: null,
      project_id: null,
      lock_version: 3,
      creator: {id: 2, nickname: 'bob', avatar: {color: 'red', image_url: null}},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual({
      id: 1,
      title: 'My Page',
      folderId: null,
      projectId: null,
      lockVersion: 3,
      creator: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });
});

describe('mapFolderedItemDetail', () => {
  const baseRaw = {
    id: 1,
    title: 'My Page',
    folder_id: null,
    project_id: null,
    lock_version: 3,
    creator: {id: 2, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    content: '<p>Hello</p>',
    currently_editing: null,
  };

  it('defaults contributors to an empty array when missing', () => {
    const result = mapFolderedItemDetail(baseRaw);

    expect(result.contributors).toEqual([]);
  });

  it('maps contributors through mapFolderedItemUser', () => {
    const result = mapFolderedItemDetail({
      ...baseRaw,
      contributors: [
        {id: 3, nickname: 'carol', avatar: {color: 'green', image_url: null}},
        {id: 4, nickname: 'dave', avatar: {color: 'pink', image_url: '/img'}},
      ],
    });

    expect(result.contributors).toEqual([
      {id: 3, nickname: 'carol', avatar: {color: 'green', imageUrl: null}},
      {id: 4, nickname: 'dave', avatar: {color: 'pink', imageUrl: '/img'}},
    ]);
  });

  it('sets currentlyEditing to null when currently_editing is null', () => {
    const result = mapFolderedItemDetail(baseRaw);

    expect(result.currentlyEditing).toBeNull();
  });

  it('maps currently_editing through mapFolderedItemEditingUser when present', () => {
    const result = mapFolderedItemDetail({
      ...baseRaw,
      currently_editing: {id: 5, nickname: 'erin'},
    });

    expect(result.currentlyEditing).toEqual({id: 5, nickname: 'erin'});
  });
});

describe('FolderedItemService', () => {
  const rawItem = {
    id: 7,
    title: 'Flow',
    folder_id: null,
    project_id: null,
    lock_version: 3,
    creator: {id: 2, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    content: '{}',
    currently_editing: null,
  };

  it('lists items from the resource key of the subclass', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {diagrams: [rawItem]}}));

    const response = await new DiagramService().list('abc', 4);

    expect(get).toHaveBeenCalledWith('/teams/abc/diagrams', {params: {project_id: 4}});
    expect(response.success && response.items.map((item) => item.id)).toEqual([7]);
  });

  it('wraps create, save and move payloads in the item key', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {page: rawItem}}));
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {page: rawItem}}));
    const service = new PageService();

    await service.create('abc', {title: 'Notes', content: '<p>Hi</p>', projectId: 4, folderId: 3});
    await service.setProject('abc', 7, null);
    await service.save('abc', 7, {title: 'Notes', content: '<p></p>', lockVersion: 2});
    await service.moveToFolder('abc', 7, 3);

    expect(post).toHaveBeenCalledWith('/teams/abc/pages', {page: {title: 'Notes', content: '<p>Hi</p>', project_id: 4, folder_id: 3}});
    expect(patch).toHaveBeenCalledWith('/teams/abc/pages/7', {page: {project_id: null}});
    expect(patch).toHaveBeenCalledWith('/teams/abc/pages/7', {page: {title: 'Notes', content: '<p></p>', lock_version: 2}});
    expect(patch).toHaveBeenCalledWith('/teams/abc/pages/7', {page: {folder_id: 3}});
  });

  it('renames with only the title and version in the item key', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {diagram: rawItem}}));

    const response = await new DiagramService().rename('abc', 7, 'Renamed', 3);

    expect(patch).toHaveBeenCalledOnceWith('/teams/abc/diagrams/7', {diagram: {title: 'Renamed', lock_version: 3}});
    expect(response.success && response.item.id).toBe(7);
  });

  it('returns the server code when a request fails', async () => {
    const error = new AxiosError('Request failed');
    error.response = {data: {code: 'PAGE_NOT_FOUND'}, status: 404, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'get').and.returnValue(Promise.reject(error));

    expect(await new PageService().get('abc', 99)).toEqual({success: false, code: 'PAGE_NOT_FOUND'});
  });

  it('returns the mapped latest item when a save conflicts', async () => {
    const error = new AxiosError('Request failed');
    error.response = {data: {code: 'EDIT_CONFLICT', page: {...rawItem, title: 'Theirs', lock_version: 4}}, status: 409, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(error));

    const response = await new PageService().save('abc', 7, {title: 'Mine', content: '', lockVersion: 3});

    expect(response.success).toBeFalse();
    expect('latest' in response && [response.latest.title, response.latest.lockVersion]).toEqual(['Theirs', 4]);
  });

  it('returns other save failures without a latest item', async () => {
    const error = new AxiosError('Request failed');
    error.response = {data: {code: 'LOCK_VERSION_REQUIRED'}, status: 422, statusText: '', headers: {}, config: {} as never};
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(error));

    expect(await new PageService().save('abc', 7, {title: 'Mine', content: '', lockVersion: 3}))
      .toEqual({success: false, code: 'LOCK_VERSION_REQUIRED'});
  });
});
