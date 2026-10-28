import {IconName} from "@components/icon/icon.component";
import {PHRASES} from "@config/phrases";
import {AVATAR_COLORS} from "@config/avatarColors";
import {MentionType, ResolvedMention} from "@models/mention.model";
import {AppRoutes} from "../app/app-routes.enum";
import {boardRoute, ticketRoute} from "@utils/ticketRoute";

export type MentionChipVariant = 'loading' | 'person' | 'removed' | 'item' | 'locked' | 'failed';

export interface MentionChipState {
  variant: MentionChipVariant;
  text: string;
  phrase: string | null;
  icon: IconName | null;
  color: string | null;
  route: (string | number)[] | null;
}

export function mentionTypePhrase(type: Exclude<MentionType, 'user'>): string {
  switch (type) {
    case 'ticket':
      return PHRASES.ITEM_TYPE_TICKET;
    case 'page':
      return PHRASES.ITEM_TYPE_PAGE;
    case 'diagram':
      return PHRASES.ITEM_TYPE_DIAGRAM;
    case 'board':
      return PHRASES.ITEM_TYPE_BOARD;
    case 'project':
      return PHRASES.ITEM_TYPE_PROJECT;
  }
}

export function mentionIcon(type: MentionType): IconName {
  return type === 'user' ? 'dot' : type;
}

export function mentionRoute(mention: ResolvedMention): (string | number)[] | null {
  switch (mention.type) {
    case 'ticket':
      return mention.boardId ? ticketRoute(mention.boardId, mention.id, !!mention.inBacklog) : null;
    case 'page':
      return [AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, mention.id];
    case 'diagram':
      return [AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, mention.id];
    case 'board':
      return boardRoute(mention.id);
    case 'project':
      return [AppRoutes.DASHBOARD, AppRoutes.PROJECTS, mention.id];
    default:
      return null;
  }
}

export function mentionChipState(type: MentionType, label: string | null, resolved: ResolvedMention | null): MentionChipState {
  const saved = type === 'user' ? `@${label ?? ''}` : '…';
  const icon = type === 'user' ? null : mentionIcon(type);
  const state: MentionChipState = {variant: 'loading', text: saved, phrase: null, icon, color: null, route: null};

  if (!resolved) {
    return state;
  }

  switch (resolved.status) {
    case 'ok':
      if (type === 'user') {
        const color = AVATAR_COLORS.find((option) => option.key === resolved.avatar?.color)?.hex ?? null;
        return {...state, variant: 'person', text: `@${resolved.nickname ?? ''}`, color};
      }
      return {...state, variant: 'item', text: resolved.title ?? '', route: mentionRoute(resolved)};
    case 'removed':
      return {...state, variant: 'removed', text: `@${resolved.nickname ?? ''}`};
    case 'hidden':
      return {...state, variant: 'locked', text: '', phrase: PHRASES.MENTION_PRIVATE_ITEM, icon: 'lock'};
    case 'deleted':
      return {...state, variant: 'locked', text: '', phrase: PHRASES.MENTION_DELETED_ITEM, icon: 'lock'};
    default:
      return {...state, variant: 'failed'};
  }
}
