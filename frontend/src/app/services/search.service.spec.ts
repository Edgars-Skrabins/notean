import {axiosInstance} from "@config/axiosConfig";
import {mapSearchResult, SearchService} from "./search.service";

describe('mapSearchResult', () => {
  it('maps snake_case fields', () => {
    expect(mapSearchResult({
      type: 'page',
      id: 1,
      title: 'Plans',
      updated_at: '2026-10-01T00:00:00Z',
      project_name: 'Game',
      snippet: 'Build a rocket',
    })).toEqual({
      type: 'page',
      id: 1,
      title: 'Plans',
      updatedAt: '2026-10-01T00:00:00Z',
      projectName: 'Game',
      snippet: 'Build a rocket',
    });
  });

  it('maps the board fields of tickets', () => {
    expect(mapSearchResult({
      type: 'ticket',
      id: 2,
      title: 'Crash',
      updated_at: '',
      project_name: null,
      snippet: null,
      board_id: 5,
      board_title: 'Sprint',
      in_backlog: true,
    })).toEqual(jasmine.objectContaining({boardId: 5, boardTitle: 'Sprint', inBacklog: true}));
  });
});

describe('SearchService', () => {
  it('searches all sections with the query and project', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({
      data: {sections: [{type: 'board', results: [{type: 'board', id: 3, title: 'Sprint', updated_at: '', project_name: null, snippet: null}], has_more: true}]},
    }));

    const response = await new SearchService().search('abc', 'spr', null);
    await new SearchService().search('abc', 'spr', 4);

    expect(get).toHaveBeenCalledWith('/teams/abc/search', {params: {q: 'spr'}});
    expect(get).toHaveBeenCalledWith('/teams/abc/search', {params: {q: 'spr', project_id: 4}});
    expect(response).toEqual({
      success: true,
      sections: [{type: 'board', results: [{type: 'board', id: 3, title: 'Sprint', updatedAt: '', projectName: null, snippet: null}], hasMore: true}],
    });
  });

  it('loads more of one section with type and offset', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({
      data: {section: {type: 'page', results: [], has_more: false}},
    }));

    const response = await new SearchService().searchMore('abc', 'spr', 4, 'page', 5);

    expect(get).toHaveBeenCalledWith('/teams/abc/search', {params: {q: 'spr', project_id: 4, type: 'page', offset: 5}});
    expect(response).toEqual({success: true, section: {type: 'page', results: [], hasMore: false}});
  });
});
