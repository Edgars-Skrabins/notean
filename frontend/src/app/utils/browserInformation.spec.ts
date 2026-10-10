import {getBrowserLanguage} from "./browserInformation";

describe('getBrowserLanguage', () => {
  it('returns the base language code for a region-specific locale', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('en-US');

    expect(getBrowserLanguage()).toBe('en');
  });

  it('returns the language code unchanged when there is no region', () => {
    spyOnProperty(navigator, 'language', 'get').and.returnValue('de');

    expect(getBrowserLanguage()).toBe('de');
  });
});
