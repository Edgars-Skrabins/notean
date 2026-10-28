import {EditConflict, Result} from "@models/result.model";
import {TeamAccessErrorCode, TemplatesErrorCode} from "@config/errorCodes";
import {FolderedItemUser} from "@models/foldered-item.model";
import {PriorityColor} from "@models/priority.model";

export type TemplateKind = 'page' | 'diagram' | 'board';

export interface TemplateSummary {
  id: number;
  kind: TemplateKind;
  title: string;
  lockVersion: number;
  canManage: boolean;
  creator: FolderedItemUser;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  content: string;
}

export interface BoardTemplateLabel {
  name: string;
  color: PriorityColor;
}

export interface BoardTemplateContent {
  columns: string[];
  priorities: BoardTemplateLabel[];
  tags: BoardTemplateLabel[];
}

export interface BuiltInTemplate {
  key: string;
  kind: TemplateKind;
  title: string;
  content: string;
}

export const BUILT_IN_TEMPLATE_PREFIX = 'builtin:';

export type ListTemplatesResponse = Result<{ templates: TemplateSummary[], hasMore: boolean }, TeamAccessErrorCode | TemplatesErrorCode>;

export type TemplateResponse = Result<{ template: TemplateDetail }, TeamAccessErrorCode | TemplatesErrorCode>;

export type SaveTemplateResponse = TemplateResponse | EditConflict<TemplateDetail>;

export type DeleteTemplateResponse = Result<object, TeamAccessErrorCode | TemplatesErrorCode>;

export type TemplateContentResponse = Result<{ content: string }, TeamAccessErrorCode | TemplatesErrorCode>;
