import {cleanMentionLabel, mentionLabelText, parseMentionText, serializeMentionDoc} from './mentionTokens';

describe('mentionTokens', () => {
  it('parses lines into paragraphs with text and mention nodes', () => {
    const doc = parseMentionText('Ask @[user:3|Ann] about @[ticket:12]\n\nthanks');

    expect(doc.content).toEqual([
      {
        type: 'paragraph', content: [
          {type: 'text', text: 'Ask '},
          {type: 'mention', attrs: {mentionType: 'user', id: '3', label: 'Ann'}},
          {type: 'text', text: ' about '},
          {type: 'mention', attrs: {mentionType: 'ticket', id: '12', label: null}},
        ],
      },
      {type: 'paragraph'},
      {type: 'paragraph', content: [{type: 'text', text: 'thanks'}]},
    ]);
  });

  it('round-trips text with tokens and line breaks', () => {
    const text = '@[page:5|Spec] first\nsecond @[board:2|Sprint]\n';

    expect(serializeMentionDoc(parseMentionText(text))).toBe(text);
  });

  it('cleans labels when serializing', () => {
    const doc = {type: 'doc', content: [{type: 'paragraph', content: [{type: 'mention', attrs: {mentionType: 'page', id: '1', label: 'A [b] | c'}}]}]};

    expect(serializeMentionDoc(doc)).toBe('@[page:1|A b  c]');
    expect(cleanMentionLabel('x\ny]')).toBe('xy');
  });

  it('leaves unknown and broken tokens as text', () => {
    const text = '@[folder:1|x] @[page:y] @[page:3|open';

    expect(parseMentionText(text).content![0].content).toEqual([{type: 'text', text}]);
  });

  it('shows people by nickname and items by type for plain display', () => {
    expect(mentionLabelText('See @[ticket:1] and @[user:2|Ann] or @[page:3|Old]', (type) => type.toUpperCase())).toBe('See @TICKET and @Ann or @PAGE');
  });
});
