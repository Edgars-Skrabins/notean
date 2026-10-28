import {routeFeature} from "./routeFeature";

describe('routeFeature', () => {
  it('returns the feature of list and detail screens', () => {
    expect(routeFeature('/dashboard/pages')).toBe('pages');
    expect(routeFeature('/dashboard/diagrams/4')).toBe('diagrams');
    expect(routeFeature('/dashboard/boards/9/kanban/tickets/3?tab=1')).toBe('boards');
    expect(routeFeature('/dashboard/chat/5?message=12')).toBe('chat');
  });

  it('returns null for screens without a feature', () => {
    expect(routeFeature('/dashboard/home')).toBeNull();
    expect(routeFeature('/dashboard/projects/2')).toBeNull();
    expect(routeFeature('/dashboard')).toBeNull();
    expect(routeFeature('/manage-team')).toBeNull();
  });
});
