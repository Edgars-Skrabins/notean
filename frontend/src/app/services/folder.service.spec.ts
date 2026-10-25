import {axiosInstance} from "@config/axiosConfig";
import {FolderService, mapFolderSummary} from "./folder.service";

const raw = {
  id: 4,
  title: 'Plans',
  parent_id: null,
  project_id: 7,
  creator: {id: 1, nickname: 'alice'},
  created_at: '2026-10-25',
  updated_at: '2026-10-25',
};

describe('mapFolderSummary', () => {
  it('maps the project', () => {
    expect(mapFolderSummary(raw).projectId).toBe(7);
  });
});

describe('FolderService', () => {
  const service = new FolderService();
  const url = '/teams/abc/folders';

  it('sends the project for a top-level folder', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {folder: raw}}));

    await service.createFolder('abc', 'Page', 'Plans', null, 7);

    expect(post).toHaveBeenCalledWith(url, {folder: {title: 'Plans', item_type: 'Page', project_id: 7}});
  });

  it('leaves the project to the parent for a subfolder', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {folder: {...raw, parent_id: 2}}}));

    await service.createFolder('abc', 'Page', 'Plans', 2, 7);

    expect(post).toHaveBeenCalledWith(url, {folder: {title: 'Plans', item_type: 'Page', parent_id: 2}});
  });

  it('changes a folder project', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {folder: raw}}));

    const response = await service.setFolderProject('abc', 4, 7);

    expect(patch).toHaveBeenCalledWith(`${url}/4`, {folder: {project_id: 7}});
    expect(response.success && response.folder.projectId).toBe(7);
  });
});
