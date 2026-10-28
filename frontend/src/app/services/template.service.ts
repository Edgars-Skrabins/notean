import {AxiosResponse} from "axios";
import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {BUILT_IN_TEMPLATES} from "@config/builtInTemplates";
import {apiRequest, versionedRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapFolderedItemUser} from "@services/foldered-item.service";
import {RawAvatar} from "@services/avatar.service";
import {
  BUILT_IN_TEMPLATE_PREFIX,
  BuiltInTemplate,
  DeleteTemplateResponse,
  ListTemplatesResponse,
  SaveTemplateResponse,
  TemplateContentResponse,
  TemplateDetail,
  TemplateKind,
  TemplateResponse,
  TemplateSummary
} from "@models/template.model";

interface RawTemplateSummary {
  id: number;
  kind: TemplateKind;
  title: string;
  lock_version: number;
  can_manage: boolean;
  creator: { id: number; nickname: string; avatar: RawAvatar };
  created_at: string;
  updated_at: string;
}

interface RawTemplateDetail extends RawTemplateSummary {
  content: string;
}

export function mapTemplateSummary(raw: RawTemplateSummary): TemplateSummary {
  return {
    id: raw.id,
    kind: raw.kind,
    title: raw.title,
    lockVersion: raw.lock_version,
    canManage: raw.can_manage,
    creator: mapFolderedItemUser(raw.creator),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapTemplateDetail(raw: RawTemplateDetail): TemplateDetail {
  return {
    ...mapTemplateSummary(raw),
    content: raw.content,
  };
}

export function builtInTemplate(kind: TemplateKind, key: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((template) => template.kind === kind && template.key === key);
}

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  async list(teamCode: string, kind: TemplateKind, search = '', offset = 0): Promise<ListTemplatesResponse> {
    const params = {kind, search: search || undefined, offset: offset || undefined};
    return apiRequest<ListTemplatesResponse>(
      axiosInstance.get(this.templatesUrl(teamCode), {params}),
      (data) => ({
        success: true,
        templates: (data.templates as RawTemplateSummary[]).map(mapTemplateSummary),
        hasMore: data.has_more,
      }),
    );
  }

  async get(teamCode: string, id: number): Promise<TemplateResponse> {
    return this.requestTemplate(axiosInstance.get(this.templatesUrl(teamCode, id)));
  }

  async create(teamCode: string, kind: TemplateKind, title: string, content: string): Promise<TemplateResponse> {
    return this.requestTemplate(axiosInstance.post(this.templatesUrl(teamCode), {template: {kind, title, content}}));
  }

  async save(teamCode: string, id: number, title: string, content: string, lockVersion: number): Promise<SaveTemplateResponse> {
    return versionedRequest<TemplateResponse, TemplateDetail>(
      axiosInstance.patch(this.templatesUrl(teamCode, id), {template: {title, content, lock_version: lockVersion}}),
      (data) => ({success: true, template: mapTemplateDetail(data.template)}),
      (data) => mapTemplateDetail(data.template),
    );
  }

  async delete(teamCode: string, id: number): Promise<DeleteTemplateResponse> {
    return apiRequest<DeleteTemplateResponse>(
      axiosInstance.delete(this.templatesUrl(teamCode, id)),
      () => ({success: true}),
    );
  }

  async resolve(teamCode: string, kind: TemplateKind, ref: string): Promise<TemplateContentResponse> {
    if (ref.startsWith(BUILT_IN_TEMPLATE_PREFIX)) {
      const template = builtInTemplate(kind, ref.slice(BUILT_IN_TEMPLATE_PREFIX.length));
      return template ? {success: true, content: template.content} : {success: false, code: 'TEMPLATE_NOT_FOUND'};
    }

    const response = await this.get(teamCode, Number(ref));
    if (!response.success) {
      return response;
    }
    if (response.template.kind !== kind) {
      return {success: false, code: 'TEMPLATE_NOT_FOUND'};
    }
    return {success: true, content: response.template.content};
  }

  private requestTemplate(request: Promise<AxiosResponse>): Promise<TemplateResponse> {
    return apiRequest<TemplateResponse>(
      request,
      (data) => ({success: true, template: mapTemplateDetail(data.template)}),
    );
  }

  private templatesUrl(teamCode: string, id?: number): string {
    return id === undefined ? teamPath(teamCode, 'templates') : teamPath(teamCode, 'templates', id);
  }
}
