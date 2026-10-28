import {AxiosError, AxiosResponse} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {CommentService, mapCommentPin} from "./comment.service";

const author = {id: 2, nickname: 'Bob', avatar: {color: 'blue' as const, image_url: null}};
const rawComment = {id: 5, body: '<p>Hi</p>', created_at: '2026-10-28T10:00:00Z', edited_at: null, author};
const rawPin = {id: 7, x: 10.5, y: -3, resolved_at: null, resolved_by: null, created_by: author, comment_count: 2, first_comment: rawComment};

describe('mapCommentPin', () => {
  it('maps the pin with its first comment', () => {
    expect(mapCommentPin(rawPin)).toEqual({
      id: 7,
      x: 10.5,
      y: -3,
      resolvedAt: null,
      resolvedBy: null,
      createdBy: {id: 2, nickname: 'Bob', avatar: {color: 'blue', imageUrl: null}},
      commentCount: 2,
      firstComment: {
        id: 5,
        body: '<p>Hi</p>',
        createdAt: '2026-10-28T10:00:00Z',
        editedAt: null,
        author: {id: 2, nickname: 'Bob', avatar: {color: 'blue', imageUrl: null}},
      },
    });
  });
});

describe('CommentService', () => {
  const service = new CommentService();

  it('lists comments of each target type, passing before_id', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {comments: [rawComment], has_more: true}}));

    const response = await service.list('abc', {type: 'ticket', boardId: 3, ticketId: 4}, 9);
    await service.list('abc', {type: 'page', pageId: 6});
    await service.list('abc', {type: 'commentPin', pinId: 7});

    expect(get.calls.argsFor(0)).toEqual(['/teams/abc/boards/3/tickets/4/comments', {params: {before_id: 9}}]);
    expect(get.calls.argsFor(1)).toEqual(['/teams/abc/pages/6/comments', {params: {}}]);
    expect(get.calls.argsFor(2)).toEqual(['/teams/abc/comment_pins/7/comments', {params: {}}]);
    expect(response.success && response.hasMore).toBeTrue();
    expect(response.success && response.comments[0].author.nickname).toBe('Bob');
  });

  it('tells whether deleting emptied a pin', async () => {
    const remove = spyOn(axiosInstance, 'delete').and.returnValues(
      Promise.resolve({data: ''}),
      Promise.resolve({data: {comment_pin_deleted: true}}),
    );

    expect(await service.delete('abc', 5)).toEqual({success: true, commentPinDeleted: false});
    expect(await service.delete('abc', 5)).toEqual({success: true, commentPinDeleted: true});
    expect(remove).toHaveBeenCalledWith('/teams/abc/comments/5');
  });

  it('creates a pin with its first comment', async () => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {comment_pin: rawPin, comment: rawComment}}));

    const response = await service.createPin('abc', 8, 10.5, -3, '<p>Hi</p>');

    expect(post).toHaveBeenCalledWith('/teams/abc/diagrams/8/comment_pins', {comment_pin: {x: 10.5, y: -3, body: '<p>Hi</p>'}});
    expect(response.success && response.commentPin.id).toBe(7);
  });

  it('returns the error code when the body is empty', async () => {
    const failure = new AxiosError('failed', undefined, undefined, undefined, {status: 422, data: {code: 'COMMENT_BODY_REQUIRED'}} as AxiosResponse);
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(failure));

    const response = await service.create('abc', {type: 'page', pageId: 6}, '<p></p>');

    expect(response).toEqual({success: false, code: 'COMMENT_BODY_REQUIRED'});
  });
});
