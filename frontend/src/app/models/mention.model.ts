import {Result} from "@models/result.model";
import {Avatar} from "@models/avatar.model";
import {MentionsErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type MentionType = 'user' | 'ticket' | 'page' | 'diagram' | 'board' | 'project';

export const MENTION_TYPES: MentionType[] = ['user', 'ticket', 'page', 'diagram', 'board', 'project'];

export interface MentionRef {
  type: MentionType;
  id: number;
}

export interface MentionCandidate extends MentionRef {
  title: string;
  subtitle: string | null;
  avatar?: Avatar;
  boardId?: number;
  inBacklog?: boolean;
}

export type MentionStatus = 'ok' | 'removed' | 'hidden' | 'deleted' | 'failed';

export interface ResolvedMention extends MentionRef {
  status: MentionStatus;
  title?: string;
  nickname?: string;
  avatar?: Avatar;
  boardId?: number;
  inBacklog?: boolean;
}

export interface MentionContext {
  boardId?: number;
  projectId?: number | null;
}

export type MentionErrors = TeamAccessErrorCode | MentionsErrorCode;

export type MentionSearchResponse = Result<{ results: MentionCandidate[] }, MentionErrors>;

export type MentionResolveResponse = Result<{ mentions: ResolvedMention[] }, MentionErrors>;
