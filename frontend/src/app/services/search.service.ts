import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {projectQuery} from "@utils/projectQuery";
import {SearchMoreResponse, SearchResponse, SearchResult, SearchResultType, SearchSection} from "@models/search.model";

interface RawSearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  updated_at: string;
  project_name: string | null;
  snippet: string | null;
  board_id?: number;
  board_title?: string;
  in_backlog?: boolean;
}

interface RawSearchSection {
  type: SearchResultType;
  results: RawSearchResult[];
  has_more: boolean;
}

export function mapSearchResult(raw: RawSearchResult): SearchResult {
  const result: SearchResult = {
    type: raw.type,
    id: raw.id,
    title: raw.title,
    updatedAt: raw.updated_at,
    projectName: raw.project_name,
    snippet: raw.snippet,
  };
  if (raw.type === 'ticket') {
    result.boardId = raw.board_id;
    result.boardTitle = raw.board_title;
    result.inBacklog = raw.in_backlog;
  }
  return result;
}

function mapSearchSection(raw: RawSearchSection): SearchSection {
  return {type: raw.type, results: raw.results.map(mapSearchResult), hasMore: raw.has_more};
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  async search(teamCode: string, query: string, projectId: number | null): Promise<SearchResponse> {
    return apiRequest<SearchResponse>(
      axiosInstance.get(teamPath(teamCode, 'search'), this.searchParams(query, projectId)),
      (data) => ({success: true, sections: (data.sections as RawSearchSection[]).map(mapSearchSection)}),
    );
  }

  async searchMore(teamCode: string, query: string, projectId: number | null, type: SearchResultType, offset: number): Promise<SearchMoreResponse> {
    return apiRequest<SearchMoreResponse>(
      axiosInstance.get(teamPath(teamCode, 'search'), this.searchParams(query, projectId, {type, offset})),
      (data) => ({success: true, section: mapSearchSection(data.section as RawSearchSection)}),
    );
  }

  private searchParams(query: string, projectId: number | null, extra: object = {}) {
    return {params: {q: query, ...projectQuery(projectId)?.params, ...extra}};
  }
}
