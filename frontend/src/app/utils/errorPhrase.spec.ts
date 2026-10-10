import {errorPhrase} from "./errorPhrase";

describe('errorPhrase', () => {
  it('builds the translation key from the code and its domain', () => {
    expect(errorPhrase('PAGE_NOT_FOUND')).toBe('ERRORS.PAGES.PAGE_NOT_FOUND');
    expect(errorPhrase('NETWORK_ERROR')).toBe('ERRORS.COMMON.NETWORK_ERROR');
    expect(errorPhrase('COLUMN_NOT_FOUND')).toBe('ERRORS.BOARDS.COLUMN_NOT_FOUND');
  });
});
