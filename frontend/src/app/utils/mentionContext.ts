import {MentionContext} from "@models/mention.model";

export function stableMentionContext(previous: MentionContext, next: MentionContext): MentionContext {
  return previous.boardId === next.boardId && (previous.projectId ?? null) === (next.projectId ?? null) ? previous : next;
}
