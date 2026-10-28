import {AxiosError, AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {mapTemplateDetail, TemplateService} from "./template.service";

const raw = {
  id: 4,
  kind: 'page' as const,
  title: 'Retro',
  lock_version: 2,
  can_manage: false,
  creator: {id: 1, nickname: 'Alice', avatar: {color: 'blue' as const, image_url: null}},
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-02T10:00:00Z',
  content: '<p>Went well</p>',
};

describe('mapTemplateDetail', () => {
  it('maps snake_case fields', () => {
    const template = mapTemplateDetail(raw);

    expect(template.lockVersion).toBe(2);
    expect(template.canManage).toBeFalse();
    expect(template.creator.nickname).toBe('Alice');
    expect(template.content).toBe('<p>Went well</p>');
  });
});

describe('TemplateService', () => {
  const service = new TemplateService();

  it('lists one kind with search and offset', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {templates: [raw], has_more: true}}));

    const response = await service.list('abc', 'page', 'ret', 50);

    expect(get).toHaveBeenCalledWith('/teams/abc/templates', {params: {kind: 'page', search: 'ret', offset: 50}});
    expect(response.success && response.hasMore).toBeTrue();
  });

  it('returns the latest template on an edit conflict', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 409, data: {code: 'EDIT_CONFLICT', template: {...raw, title: 'Newer'}}} as AxiosResponse);
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(failure));

    const response = await service.save('abc', 4, 'Retro', '', 1);

    expect('latest' in response && response.latest.title).toBe('Newer');
  });

  it('resolves a built-in template without a request', async () => {
    const get = spyOn(axiosInstance, 'get');

    const response = await service.resolve('abc', 'page', 'builtin:meeting-notes');

    expect(get).not.toHaveBeenCalled();
    expect(response.success && response.content).toContain('Meeting notes');
  });

  it('rejects an unknown built-in key and a built-in of another kind', async () => {
    expect(await service.resolve('abc', 'page', 'builtin:missing')).toEqual({success: false, code: 'TEMPLATE_NOT_FOUND'});
    expect(await service.resolve('abc', 'page', 'builtin:decision-tree')).toEqual({success: false, code: 'TEMPLATE_NOT_FOUND'});
  });

  it('resolves a team template only when it has the requested kind', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {template: raw}}));

    expect(await service.resolve('abc', 'page', '4')).toEqual({success: true, content: '<p>Went well</p>'});
    expect(await service.resolve('abc', 'diagram', '4')).toEqual({success: false, code: 'TEMPLATE_NOT_FOUND'});
  });
});
