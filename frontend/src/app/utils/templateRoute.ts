import {Params} from "@angular/router";
import {TemplateKind} from "@models/template.model";
import {AppRoutes} from "../app/app-routes.enum";

export const TEMPLATE_ITEM_ROUTES: Record<Exclude<TemplateKind, 'board'>, AppRoutes> = {
  page: AppRoutes.DOCUMENT_PAGES,
  diagram: AppRoutes.DIAGRAMS,
};

export function templatesRoute(kind: TemplateKind): (string | number)[] {
  return kind === 'board'
    ? [AppRoutes.DASHBOARD, AppRoutes.BOARD_TEMPLATES]
    : [AppRoutes.DASHBOARD, TEMPLATE_ITEM_ROUTES[kind], AppRoutes.TEMPLATES];
}

export function templateRoute(kind: TemplateKind, id: number | typeof AppRoutes.NEW): (string | number)[] {
  return [...templatesRoute(kind), id];
}

export function builtInTemplateRoute(kind: TemplateKind, key: string): (string | number)[] {
  return [...templatesRoute(kind), AppRoutes.BUILTIN, key];
}

export function createFromTemplateRoute(kind: Exclude<TemplateKind, 'board'>, ref: string, folderId: number | null = null): { commands: (string | number)[]; queryParams: Params } {
  return {
    commands: [AppRoutes.DASHBOARD, TEMPLATE_ITEM_ROUTES[kind], AppRoutes.NEW],
    queryParams: folderId !== null ? {template: ref, folder: folderId} : {template: ref},
  };
}
