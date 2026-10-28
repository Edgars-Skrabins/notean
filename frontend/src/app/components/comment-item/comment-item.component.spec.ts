import {TranslateService} from '@ngx-translate/core';
import {CommentItemComponent} from './comment-item.component';
import {CommentService} from '@services/comment.service';
import {Comment} from '@models/comment.model';

const comment: Comment = {
  id: 5,
  body: '<p>Hi</p>',
  createdAt: '2026-10-28T10:00:00Z',
  editedAt: null,
  author: {id: 2, nickname: 'Bob', avatar: {color: 'blue', imageUrl: null}},
};

describe('CommentItemComponent', () => {
  let component: CommentItemComponent;
  let commentService: jasmine.SpyObj<CommentService>;

  beforeEach(() => {
    commentService = jasmine.createSpyObj<CommentService>('CommentService', ['update', 'delete']);
    const translateService = {getCurrentLang: () => 'en', getFallbackLang: () => 'en'} as unknown as TranslateService;
    component = new CommentItemComponent(commentService, translateService);
    component.comment = comment;
    component.teamCode = 'abc';
  });

  it('offers edit and delete according to the permissions', () => {
    component.canEdit = true;
    component.canDelete = true;
    expect(component.actions.map((action) => action.value)).toEqual(['edit', 'delete']);

    component.canEdit = false;
    expect(component.actions.map((action) => action.value)).toEqual(['delete']);

    component.canDelete = false;
    expect(component.actions).toEqual([]);
  });

  it('saves the edited body and emits the updated comment', async () => {
    const edited = {...comment, body: '<p>Fixed</p>', editedAt: '2026-10-28T11:00:00Z'};
    commentService.update.and.resolveTo({success: true, comment: edited});
    const updated = spyOn(component.updated, 'emit');
    component.handleAction('edit');
    component.draft = '<p>Fixed</p>';

    await component.save();

    expect(commentService.update).toHaveBeenCalledWith('abc', 5, '<p>Fixed</p>');
    expect(updated).toHaveBeenCalledWith(edited);
    expect(component.isEditing).toBeFalse();
  });

  it('does not save an empty body and cancelling keeps the original', async () => {
    component.handleAction('edit');
    component.draft = '<p> </p>';

    await component.save();
    component.cancelEdit();

    expect(commentService.update).not.toHaveBeenCalled();
    expect(component.isEditing).toBeFalse();
    expect(component.comment.body).toBe('<p>Hi</p>');
  });

  it('removes a comment that is already gone', async () => {
    commentService.delete.and.resolveTo({success: false, code: 'COMMENT_NOT_FOUND'});
    const deleted = spyOn(component.deleted, 'emit');
    const failed = spyOn(component.failed, 'emit');

    await component.confirmDelete();

    expect(failed).toHaveBeenCalledWith('COMMENT_NOT_FOUND');
    expect(deleted).toHaveBeenCalledWith(false);
  });
});
