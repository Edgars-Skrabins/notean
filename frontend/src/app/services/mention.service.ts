import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {
  MentionCandidate,
  MentionContext,
  MentionRef,
  MentionResolveResponse,
  MentionSearchResponse,
  MentionStatus,
  MentionType,
  ResolvedMention
} from "@models/mention.model";

const RESOLVE_CHUNK = 200;

interface RawMentionCandidate {
  type: MentionType;
  id: number;
  title: string;
  subtitle: string | null;
  avatar?: RawAvatar;
  board_id?: number;
  in_backlog?: boolean;
}

interface RawResolvedMention {
  type: MentionType;
  id: number;
  status: MentionStatus;
  title?: string;
  nickname?: string;
  avatar?: RawAvatar;
  board_id?: number;
  in_backlog?: boolean;
}

interface PendingResolve {
  ref: MentionRef;
  resolvers: ((resolved: ResolvedMention) => void)[];
}

export function mapMentionCandidate(raw: RawMentionCandidate): MentionCandidate {
  const candidate: MentionCandidate = {type: raw.type, id: raw.id, title: raw.title, subtitle: raw.subtitle};
  if (raw.avatar) {
    candidate.avatar = mapAvatar(raw.avatar);
  }
  if (raw.type === 'ticket') {
    candidate.boardId = raw.board_id;
    candidate.inBacklog = raw.in_backlog;
  }
  return candidate;
}

export function mapResolvedMention(raw: RawResolvedMention): ResolvedMention {
  const resolved: ResolvedMention = {type: raw.type, id: raw.id, status: raw.status};
  if (raw.title !== undefined) {
    resolved.title = raw.title;
  }
  if (raw.nickname !== undefined) {
    resolved.nickname = raw.nickname;
  }
  if (raw.avatar) {
    resolved.avatar = mapAvatar(raw.avatar);
  }
  if (raw.board_id !== undefined) {
    resolved.boardId = raw.board_id;
    resolved.inBacklog = raw.in_backlog;
  }
  return resolved;
}

function refKey(ref: MentionRef): string {
  return `${ref.type}:${ref.id}`;
}

@Injectable({
  providedIn: 'root',
})
export class MentionService {
  private pending = new Map<string, Map<string, PendingResolve>>();

  async search(teamCode: string, query: string, context: MentionContext, signal?: AbortSignal): Promise<MentionSearchResponse> {
    const params: Record<string, string | number> = {q: query};
    if (context.boardId) {
      params['board_id'] = context.boardId;
    }
    if (context.projectId) {
      params['project_id'] = context.projectId;
    }
    return apiRequest<MentionSearchResponse>(
      axiosInstance.get(teamPath(teamCode, 'mentions', 'search'), {params, signal}),
      (data) => ({success: true, results: (data.results as RawMentionCandidate[]).map(mapMentionCandidate)}),
    );
  }

  resolve(teamCode: string, ref: MentionRef): Promise<ResolvedMention> {
    return new Promise((resolve) => {
      let batch = this.pending.get(teamCode);
      if (!batch) {
        batch = new Map();
        this.pending.set(teamCode, batch);
        setTimeout(() => this.flush(teamCode));
      }
      const key = refKey(ref);
      const entry = batch.get(key) ?? {ref, resolvers: []};
      entry.resolvers.push(resolve);
      batch.set(key, entry);
    });
  }

  private flush(teamCode: string) {
    const batch = Array.from(this.pending.get(teamCode)?.values() ?? []);
    this.pending.delete(teamCode);
    for (let start = 0; start < batch.length; start += RESOLVE_CHUNK) {
      this.request(teamCode, batch.slice(start, start + RESOLVE_CHUNK));
    }
  }

  private async request(teamCode: string, entries: PendingResolve[]) {
    const response = await apiRequest<MentionResolveResponse>(
      axiosInstance.post(teamPath(teamCode, 'mentions', 'resolve'), {mentions: entries.map((entry) => entry.ref)}),
      (data) => ({success: true, mentions: (data.mentions as RawResolvedMention[]).map(mapResolvedMention)}),
    );
    const byKey = new Map(response.success ? response.mentions.map((mention) => [refKey(mention), mention]) : []);
    entries.forEach((entry) => {
      const resolved = byKey.get(refKey(entry.ref)) ?? {...entry.ref, status: 'failed' as const};
      entry.resolvers.forEach((resolver) => resolver(resolved));
    });
  }
}
