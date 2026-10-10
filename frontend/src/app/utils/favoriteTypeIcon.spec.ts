import {favoriteTypeIcon} from "./favoriteTypeIcon";

describe('favoriteTypeIcon', () => {
  it('uses the edit icon for pages and diagrams', () => {
    expect(favoriteTypeIcon('Page')).toBe('edit');
    expect(favoriteTypeIcon('Diagram')).toBe('edit');
  });

  it('uses the menu icon for boards', () => {
    expect(favoriteTypeIcon('Board')).toBe('menu');
  });

  it('uses the process icon for cards', () => {
    expect(favoriteTypeIcon('Card')).toBe('flow-process');
  });
});
