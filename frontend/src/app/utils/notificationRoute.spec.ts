import {notificationRoute} from "./notificationRoute";
import {AppRoutes} from "../app/app-routes.enum";
import {testNotification} from "../testing/notificationFixtures";

describe('notificationRoute', () => {
  it('routes a ticket to its popup on the Kanban tab, or the List tab from the backlog', () => {
    expect(notificationRoute(testNotification({itemId: 10, boardId: 3})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 3, AppRoutes.KANBAN, AppRoutes.TICKETS, 10]);
    expect(notificationRoute(testNotification({itemId: 10, boardId: 3, inBacklog: true})))
      .toEqual([AppRoutes.DASHBOARD, AppRoutes.BOARDS, 3, AppRoutes.LIST, AppRoutes.TICKETS, 10]);
  });

  it('routes pages, diagrams and projects to their detail views', () => {
    expect(notificationRoute(testNotification({itemType: 'Page', itemId: 4}))).toEqual([AppRoutes.DASHBOARD, AppRoutes.DOCUMENT_PAGES, 4]);
    expect(notificationRoute(testNotification({itemType: 'Diagram', itemId: 5}))).toEqual([AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS, 5]);
    expect(notificationRoute(testNotification({itemType: 'Project', itemId: 6}))).toEqual([AppRoutes.DASHBOARD, AppRoutes.PROJECTS, 6]);
  });

  it('has no route for a deleted item', () => {
    expect(notificationRoute(testNotification({kind: 'item_deleted', itemId: null}))).toBeNull();
  });
});
