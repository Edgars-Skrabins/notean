import {JSONContent} from '@tiptap/core';
import {MentionType} from "@models/mention.model";

export const MENTION_NODE = 'mention';

const TOKEN_PATTERN = /@\[(user|ticket|page|diagram|board|project):(\d+)(?:\|([^\]\n]*))?\]/g;

export function cleanMentionLabel(title: string): string {
  return title.replace(/[[\]|\r\n]/g, '');
}

export function mentionToken(type: MentionType, id: number | string, label: string | null): string {
  const cleaned = cleanMentionLabel(label ?? '');
  return cleaned ? `@[${type}:${id}|${cleaned}]` : `@[${type}:${id}]`;
}

export function parseMentionText(text: string): JSONContent {
  return {
    type: 'doc',
    content: text.split('\n').map((line) => {
      const content = parseLine(line);
      return content.length ? {type: 'paragraph', content} : {type: 'paragraph'};
    }),
  };
}

export function serializeMentionDoc(doc: JSONContent): string {
  return (doc.content ?? []).map((paragraph) => (paragraph.content ?? []).map(serializeInline).join('')).join('\n');
}

export function mentionLabelText(text: string, typeLabel: (type: Exclude<MentionType, 'user'>) => string): string {
  return text.replace(TOKEN_PATTERN, (_match, type: MentionType, _id, label) => type === 'user' ? `@${label ?? ''}` : `@${typeLabel(type)}`);
}

function parseLine(line: string): JSONContent[] {
  const content: JSONContent[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    if (match.index > last) {
      content.push({type: 'text', text: line.slice(last, match.index)});
    }
    content.push({type: MENTION_NODE, attrs: {mentionType: match[1], id: match[2], label: match[3] ?? null}});
    last = match.index + match[0].length;
  }
  if (last < line.length) {
    content.push({type: 'text', text: line.slice(last)});
  }
  return content;
}

function serializeInline(node: JSONContent): string {
  if (node.type === MENTION_NODE) {
    return mentionToken(node.attrs?.['mentionType'], node.attrs?.['id'], node.attrs?.['label'] ?? null);
  }
  if (node.type === 'hardBreak') {
    return '\n';
  }
  return node.text ?? '';
}
