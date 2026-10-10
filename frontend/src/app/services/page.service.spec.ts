import {mapPageDetail, mapPageEditingUser, mapPageSummary, mapPageUser} from "./page.service";

describe('mapPageUser', () => {
  it('maps id, nickname and avatar', () => {
    const result = mapPageUser({id: 1, nickname: 'alice', avatar: {color: 'blue', image_url: '/img'}});

    expect(result).toEqual({id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: '/img'}});
  });
});

describe('mapPageEditingUser', () => {
  it('maps id and nickname', () => {
    const result = mapPageEditingUser({id: 1, nickname: 'alice'});

    expect(result).toEqual({id: 1, nickname: 'alice'});
  });
});

describe('mapPageSummary', () => {
  it('maps snake_case fields and nests the creator', () => {
    const result = mapPageSummary({
      id: 1,
      title: 'My Page',
      folder_id: null,
      creator: {id: 2, nickname: 'bob', avatar: {color: 'red', image_url: null}},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    expect(result).toEqual({
      id: 1,
      title: 'My Page',
      folderId: null,
      creator: {id: 2, nickname: 'bob', avatar: {color: 'red', imageUrl: null}},
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
    creator: {id: 2, nickname: 'bob', avatar: {color: 'red' as const, image_url: null}},
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
    const result = mapPageDetail(baseRaw);

    expect(result.currentlyEditing).toBeNull();
  });

  it('maps currently_editing through mapPageEditingUser when present', () => {
    const result = mapPageDetail({
      ...baseRaw,
      currently_editing: {id: 5, nickname: 'erin'},
    });

    expect(result.currentlyEditing).toEqual({id: 5, nickname: 'erin'});
  });
});
