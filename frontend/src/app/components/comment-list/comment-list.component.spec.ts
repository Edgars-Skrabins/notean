import {SimpleChange} from '@angular/core';
import {CommentListComponent} from './comment-list.component';
import {CommentService} from '@services/comment.service';
import {AuthService} from '@services/auth.service';
import {TeamService} from '@services/team.service';
import {Comment, CommentTarget} from '@models/comment.model';

function comment(id: number, authorId = 2): Comment {
  return {
    id,
    body: `<p>Comment ${id}</p>`,
    createdAt: '2026-10-28T10:00:00Z',
    editedAt: null,
    author: {id: authorId, nickname: 'Bob', avatar: {color: 'blue', imageUrl: null}},
  };
}

describe('CommentListComponent', () => {
  const target: CommentTarget = {type: 'page', pageId: 6};
  let component: CommentListComponent;
  let commentService: jasmine.SpyObj<CommentService>;

  function create(role: string) {
    const authService = {getCurrentUser: () => ({id: 1})} as unknown as AuthService;
    const teamService = {getCurrentTeamCode: () => 'abc', getCurrentRole: () => role} as unknown as TeamService;
    component = new CommentListComponent(commentService, authService, teamService);
    component.target = target;
  }

  async function load() {
    component.ngOnChanges({target: new SimpleChange(undefined, target, true)});
    await commentService.list.calls.mostRecent().returnValue;
  }

  beforeEach(() => {
    commentService = jasmine.createSpyObj<CommentService>('CommentService', ['list', 'create']);
    create('user');
  });

  it('shows the newest page oldest first and prepends older pages', async () => {
    commentService.list.and.returnValues(
      Promise.resolve({success: true, comments: [comment(9), comment(8)], hasMore: true}),
      Promise.resolve({success: true, comments: [comment(7), comment(6)], hasMore: false}),
    );
    await load();

    expect(component.comments.map((item) => item.id)).toEqual([8, 9]);

    await component.loadMore();

    expect(commentService.list).toHaveBeenCalledWith('abc', target, 8);
    expect(component.comments.map((item) => item.id)).toEqual([6, 7, 8, 9]);
    expect(component.hasMore).toBeFalse();
  });

  it('appends a posted comment and clears the editor', async () => {
    commentService.list.and.resolveTo({success: true, comments: [comment(8)], hasMore: false});
    commentService.create.and.resolveTo({success: true, comment: comment(9, 1)});
    await load();
    component.draft = '<p>New</p>';

    await component.post();

    expect(commentService.create).toHaveBeenCalledWith('abc', target, '<p>New</p>');
    expect(component.comments.map((item) => item.id)).toEqual([8, 9]);
    expect(component.draft).toBe('');
  });

  it('lets authors edit and managers delete', () => {
    expect(component.canEdit(comment(1, 1))).toBeTrue();
    expect(component.canDelete(comment(2, 2))).toBeFalse();

    create('admin');

    expect(component.canEdit(comment(2, 2))).toBeFalse();
    expect(component.canDelete(comment(2, 2))).toBeTrue();
  });

  it('emits emptied when deleting removed the pin', async () => {
    commentService.list.and.resolveTo({success: true, comments: [comment(8)], hasMore: false});
    await load();
    const emptied = spyOn(component.emptied, 'emit');

    component.handleDeleted(component.comments[0], true);

    expect(component.comments).toEqual([]);
    expect(emptied).toHaveBeenCalled();
  });
});
