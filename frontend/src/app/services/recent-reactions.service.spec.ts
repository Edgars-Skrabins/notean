import {DEFAULT_REACTIONS, RecentReactionsService} from "./recent-reactions.service";

describe('RecentReactionsService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts from the default six', () => {
    expect(new RecentReactionsService().recent).toEqual(DEFAULT_REACTIONS);
  });

  it('moves a used emoji to the front, keeps six and remembers them', () => {
    const service = new RecentReactionsService();

    service.use('🚀');
    service.use('😂');

    expect(service.recent).toEqual(['😂', '🚀', '👍', '❤️', '😮', '😢']);
    expect(new RecentReactionsService().recent).toEqual(['😂', '🚀', '👍', '❤️', '😮', '😢']);
  });
});
