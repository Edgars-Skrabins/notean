import {Result} from "@models/result.model";
import {BoardsErrorCode, PrioritiesErrorCode, TeamAccessErrorCode} from "@config/errorCodes";

export const PRIORITY_COLORS = ['grey', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'purple'] as const;

export type PriorityColor = typeof PRIORITY_COLORS[number];

export interface BoardPriority {
  id: number;
  name: string;
  color: PriorityColor;
  position: number;
  ticketCount: number;
}

export type PriorityResponse = Result<{ priority: BoardPriority }, TeamAccessErrorCode | BoardsErrorCode | PrioritiesErrorCode>;

export type PrioritiesResponse = Result<{ priorities: BoardPriority[] }, TeamAccessErrorCode | BoardsErrorCode | PrioritiesErrorCode>;
