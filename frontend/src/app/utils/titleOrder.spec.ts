import {compareByTitle} from "./titleOrder";

describe('compareByTitle', () => {
  it('sorts by lowercase title, then by id', () => {
    const items = [{id: 3, title: 'beta'}, {id: 2, title: 'Alpha'}, {id: 1, title: 'beta'}];

    expect([...items].sort(compareByTitle).map((item) => item.id)).toEqual([2, 1, 3]);
  });
});
