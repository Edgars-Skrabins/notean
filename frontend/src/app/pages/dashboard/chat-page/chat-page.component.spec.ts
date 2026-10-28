import {typingPhrase} from './chat-page.component';
import {PHRASES} from '@config/phrases';

describe('typingPhrase', () => {
  it('names one or two people and summarises more', () => {
    expect(typingPhrase([])).toBeNull();
    expect(typingPhrase(['Anna'])).toEqual({key: PHRASES.TYPING_ONE, params: {name: 'Anna'}});
    expect(typingPhrase(['Anna', 'Jānis'])).toEqual({key: PHRASES.TYPING_TWO, params: {first: 'Anna', second: 'Jānis'}});
    expect(typingPhrase(['Anna', 'Jānis', 'Bob'])).toEqual({key: PHRASES.TYPING_MANY, params: {}});
  });
});
