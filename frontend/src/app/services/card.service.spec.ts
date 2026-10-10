import {mapCardDetail} from "./card.service";

describe('mapCardDetail', () => {
  const baseRaw = {
    id: 1,
    title: 'My Card',
    position: 2,
    description: 'Details',
    column_id: 3,
    creator: {id: 4, nickname: 'bob'},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  it('maps snake_case fields and nests the creator', () => {
    const result = mapCardDetail(baseRaw);

    expect(result).toEqual({
      id: 1,
      title: 'My Card',
      position: 2,
      description: 'Details',
      columnId: 3,
      creator: {id: 4, nickname: 'bob'},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });

  it('defaults description to an empty string when null', () => {
    const result = mapCardDetail({...baseRaw, description: null as unknown as string});

    expect(result.description).toBe('');
  });
});
