import {pluralKey} from './plural';

describe('pluralKey', () => {
  it('picks one and other in English', () => {
    expect(pluralKey('MEMBER_COUNT', 1, 'en')).toBe('MEMBER_COUNT.one');
    expect(pluralKey('MEMBER_COUNT', 2, 'en')).toBe('MEMBER_COUNT.other');
  });

  it('picks the Latvian zero form for 0 and the teens, and one for 21', () => {
    expect(pluralKey('MEMBER_COUNT', 0, 'lv')).toBe('MEMBER_COUNT.zero');
    expect(pluralKey('MEMBER_COUNT', 21, 'lv')).toBe('MEMBER_COUNT.one');
    expect(pluralKey('MEMBER_COUNT', 11, 'lv')).toBe('MEMBER_COUNT.zero');
  });

  it('picks the Russian few, many and one forms', () => {
    expect(pluralKey('MEMBER_COUNT', 3, 'ru')).toBe('MEMBER_COUNT.few');
    expect(pluralKey('MEMBER_COUNT', 5, 'ru')).toBe('MEMBER_COUNT.many');
    expect(pluralKey('MEMBER_COUNT', 21, 'ru')).toBe('MEMBER_COUNT.one');
  });

  it('picks the Lithuanian few and other forms', () => {
    expect(pluralKey('MEMBER_COUNT', 2, 'lt')).toBe('MEMBER_COUNT.few');
    expect(pluralKey('MEMBER_COUNT', 10, 'lt')).toBe('MEMBER_COUNT.other');
  });
});
