import {mapPageDetail, mapPageSummary, mapPageUser} from "./page.service";

describe('mapPageUser', () => {
  it('maps id and username', () => {
    const result = mapPageUser({id: 1, username: 'alice'});

    expect(result).toEqual({id: 1, username: 'alice'});
  });
});

describe('mapPageSummary', () => {
  it('maps snake_case fields and nests the creator', () => {
    const result = mapPageSummary({
      id: 1,
      title: 'My Page',
      folder_id: null,
      creator: {id: 2, username: 'bob'},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual({
      id: 1,
      title: 'My Page',
      folderId: null,
      creator: {id: 2, username: 'bob'},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });
});

describe('mapPageDetail', () => {
  const baseRaw = {
    id: 1,
    title: 'My Page',
    folder_id: null,
    creator: {id: 2, username: 'bob'},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    content: '<p>Hello</p>',
    currently_editing: null,
  };

  it('defaults contributors to an empty array when missing', () => {
    const result = mapPageDetail(baseRaw);

    expect(result.contributors).toEqual([]);
  });

  it('maps contributors through mapPageUser', () => {
    const result = mapPageDetail({
      ...baseRaw,
      contributors: [{id: 3, username: 'carol'}, {id: 4, username: 'dave'}],
    });

    expect(result.contributors).toEqual([
      {id: 3, username: 'carol'},
      {id: 4, username: 'dave'},
    ]);
  });

  it('sets currentlyEditing to null when currently_editing is null', () => {
    const result = mapPageDetail(baseRaw);

    expect(result.currentlyEditing).toBeNull();
  });

  it('maps currently_editing through mapPageUser when present', () => {
    const result = mapPageDetail({
      ...baseRaw,
      currently_editing: {id: 5, username: 'erin'},
    });

    expect(result.currentlyEditing).toEqual({id: 5, username: 'erin'});
  });
});
