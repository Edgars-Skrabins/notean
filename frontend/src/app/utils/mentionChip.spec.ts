import {mentionChipState, mentionRoute} from './mentionChip';
import {PHRASES} from "@config/phrases";

describe('mentionChipState', () => {
  it('shows a neutral placeholder for items and the saved nickname for people while loading', () => {
    expect(mentionChipState('page', 'Spec', null)).toEqual(jasmine.objectContaining({variant: 'loading', text: '…', icon: 'page', route: null}));
    expect(mentionChipState('user', 'Ann', null)).toEqual(jasmine.objectContaining({variant: 'loading', text: '@Ann'}));
  });

  it('shows the current title and route of a visible item', () => {
    expect(mentionChipState('page', 'Old', {type: 'page', id: 4, status: 'ok', title: 'New'}))
      .toEqual({variant: 'item', text: 'New', phrase: null, icon: 'page', color: null, route: ['dashboard', 'pages', 4]});
  });

  it('shows people with their avatar colour and former members muted', () => {
    expect(mentionChipState('user', 'Ann', {type: 'user', id: 1, status: 'ok', nickname: 'Annie', avatar: {color: 'red', imageUrl: null}}))
      .toEqual(jasmine.objectContaining({variant: 'person', text: '@Annie', color: '#E53935', icon: null, route: null}));
    expect(mentionChipState('user', 'Ann', {type: 'user', id: 1, status: 'removed', nickname: 'Ann'}))
      .toEqual(jasmine.objectContaining({variant: 'removed', text: '@Ann', route: null}));
  });

  it('locks hidden and deleted items without their title', () => {
    expect(mentionChipState('ticket', 'Secret', {type: 'ticket', id: 2, status: 'hidden'}))
      .toEqual(jasmine.objectContaining({variant: 'locked', text: '', phrase: PHRASES.MENTION_PRIVATE_ITEM, route: null}));
    expect(mentionChipState('board', 'Gone', {type: 'board', id: 3, status: 'deleted'}))
      .toEqual(jasmine.objectContaining({variant: 'locked', text: '', phrase: PHRASES.MENTION_DELETED_ITEM}));
  });

  it('keeps the placeholder without a link when resolving failed', () => {
    expect(mentionChipState('diagram', null, {type: 'diagram', id: 3, status: 'failed'}))
      .toEqual(jasmine.objectContaining({variant: 'failed', text: '…', route: null}));
  });
});

describe('mentionRoute', () => {
  it('routes tickets to their board tab', () => {
    expect(mentionRoute({type: 'ticket', id: 9, status: 'ok', boardId: 2, inBacklog: true})).toEqual(['dashboard', 'boards', 2, 'list', 'tickets', 9]);
    expect(mentionRoute({type: 'ticket', id: 9, status: 'ok', boardId: 2, inBacklog: false})).toEqual(['dashboard', 'boards', 2, 'kanban', 'tickets', 9]);
  });

  it('routes boards and projects', () => {
    expect(mentionRoute({type: 'board', id: 2, status: 'ok'})).toEqual(['dashboard', 'boards', 2, 'kanban']);
    expect(mentionRoute({type: 'project', id: 5, status: 'ok'})).toEqual(['dashboard', 'projects', 5]);
  });
});
