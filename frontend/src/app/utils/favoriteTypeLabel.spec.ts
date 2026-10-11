import {favoriteTypeLabel} from "./favoriteTypeLabel";
import {PHRASES} from "@config/phrases";

describe('favoriteTypeLabel', () => {
  it('returns the page phrase for Page', () => {
    expect(favoriteTypeLabel('Page')).toBe(PHRASES.ITEM_TYPE_PAGE);
  });

  it('returns the diagram phrase for Diagram', () => {
    expect(favoriteTypeLabel('Diagram')).toBe(PHRASES.ITEM_TYPE_DIAGRAM);
  });

  it('returns the board phrase for Board', () => {
    expect(favoriteTypeLabel('Board')).toBe(PHRASES.ITEM_TYPE_BOARD);
  });

  it('returns the ticket phrase for Ticket', () => {
    expect(favoriteTypeLabel('Ticket')).toBe(PHRASES.ITEM_TYPE_TICKET);
  });
});
