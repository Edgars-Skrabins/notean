import {linkifyMentionDoc} from "./linkifyMentionDoc";
import {parseMentionText} from "./mentionTokens";

describe('linkifyMentionDoc', () => {
  it('turns http and https URLs into links, leaving trailing punctuation and mentions alone', () => {
    const doc = linkifyMentionDoc(parseMentionText('See https://example.com/a?b=1, or @[user:2|Bob] at http://x.io.'));

    expect(doc.content![0].content).toEqual([
      {type: 'text', text: 'See '},
      {type: 'text', text: 'https://example.com/a?b=1', marks: [{type: 'link', attrs: {href: 'https://example.com/a?b=1'}}]},
      {type: 'text', text: ', or '},
      {type: 'mention', attrs: {mentionType: 'user', id: '2', label: 'Bob'}},
      {type: 'text', text: ' at '},
      {type: 'text', text: 'http://x.io', marks: [{type: 'link', attrs: {href: 'http://x.io'}}]},
      {type: 'text', text: '.'},
    ]);
  });

  it('never links other schemes and keeps empty lines', () => {
    const doc = linkifyMentionDoc(parseMentionText('javascript:alert(1)\n\nftp://files'));

    expect(doc.content).toEqual([
      {type: 'paragraph', content: [{type: 'text', text: 'javascript:alert(1)'}]},
      {type: 'paragraph'},
      {type: 'paragraph', content: [{type: 'text', text: 'ftp://files'}]},
    ]);
  });
});
