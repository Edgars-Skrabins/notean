import {AppRoutes} from "../app/app-routes.enum";
import {builtInTemplateRoute, createFromTemplateRoute, templateRoute, templatesRoute} from "./templateRoute";

describe('templateRoute', () => {
  it('puts page and diagram templates under their screen and board templates on their own screen', () => {
    expect(templatesRoute('page')).toEqual(['dashboard', 'pages', 'templates']);
    expect(templateRoute('diagram', 7)).toEqual(['dashboard', 'diagrams', 'templates', 7]);
    expect(templateRoute('board', AppRoutes.NEW)).toEqual(['dashboard', 'board-templates', 'new']);
    expect(builtInTemplateRoute('page', 'concept')).toEqual(['dashboard', 'pages', 'templates', 'builtin', 'concept']);
  });

  it('opens the create popup with the template and keeps the folder', () => {
    expect(createFromTemplateRoute('page', 'builtin:concept')).toEqual({commands: ['dashboard', 'pages', 'new'], queryParams: {template: 'builtin:concept'}});
    expect(createFromTemplateRoute('diagram', '4', 9)).toEqual({commands: ['dashboard', 'diagrams', 'new'], queryParams: {template: '4', folder: 9}});
  });
});
