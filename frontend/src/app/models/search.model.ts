import {Result} from "@models/result.model";
import {ProjectsErrorCode, SearchErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export type SearchResultType = 'project' | 'page' | 'diagram' | 'board' | 'ticket';

export interface SearchResult {
  type: SearchResultType;
  id: number;
  title: string;
  updatedAt: string;
  projectName: string | null;
  snippet: string | null;
  boardId?: number;
  boardTitle?: string;
  inBacklog?: boolean;
}

export interface SearchSection {
  type: SearchResultType;
  results: SearchResult[];
  hasMore: boolean;
}

export type SearchErrors = TeamAccessErrorCode | ProjectsErrorCode | SearchErrorCode;

export type SearchResponse = Result<{ sections: SearchSection[] }, SearchErrors>;

export type SearchMoreResponse = Result<{ section: SearchSection }, SearchErrors>;
