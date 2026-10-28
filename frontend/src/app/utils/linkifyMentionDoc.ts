import {JSONContent} from '@tiptap/core';

const URL_PATTERN = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

export function linkifyMentionDoc(doc: JSONContent): JSONContent {
  return {
    ...doc,
    content: (doc.content ?? []).map((paragraph) => paragraph.content
      ? {...paragraph, content: paragraph.content.flatMap(linkifyNode)}
      : paragraph),
  };
}

function linkifyNode(node: JSONContent): JSONContent[] {
  if (node.type !== 'text' || !node.text) {
    return [node];
  }

  const parts: JSONContent[] = [];
  let last = 0;
  for (const match of node.text.matchAll(URL_PATTERN)) {
    if (match.index > last) {
      parts.push({type: 'text', text: node.text.slice(last, match.index)});
    }
    parts.push({type: 'text', text: match[0], marks: [{type: 'link', attrs: {href: match[0]}}]});
    last = match.index + match[0].length;
  }
  if (last < node.text.length) {
    parts.push({type: 'text', text: node.text.slice(last)});
  }
  return parts;
}
