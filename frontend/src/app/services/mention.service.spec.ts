import {fakeAsync, flushMicrotasks, tick} from '@angular/core/testing';
import {AxiosError} from "axios";
import {axiosInstance} from "@config/axiosConfig";
import {MentionService} from "./mention.service";
import {ResolvedMention} from "@models/mention.model";

describe('MentionService', () => {
  let service: MentionService;

  beforeEach(() => {
    service = new MentionService();
  });

  it('searches with the query and the field context', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({
      data: {results: [{type: 'ticket', id: 4, title: 'Bug', subtitle: 'Sprint', board_id: 2, in_backlog: true}]},
    }));

    const response = await service.search('T1', 'bu', {boardId: 2, projectId: 7});

    expect(get).toHaveBeenCalledWith('/teams/T1/mentions/search', jasmine.objectContaining({params: {q: 'bu', board_id: 2, project_id: 7}}));
    expect(response).toEqual({success: true, results: [{type: 'ticket', id: 4, title: 'Bug', subtitle: 'Sprint', boardId: 2, inBacklog: true}]});
  });

  it('batches refs of one tick into one de-duplicated request', fakeAsync(() => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({
      data: {mentions: [{type: 'page', id: 1, status: 'ok', title: 'Spec'}, {type: 'user', id: 2, status: 'removed', nickname: 'Ann'}]},
    }));
    const results: ResolvedMention[] = [];

    service.resolve('T1', {type: 'page', id: 1}).then((resolved) => results.push(resolved));
    service.resolve('T1', {type: 'user', id: 2}).then((resolved) => results.push(resolved));
    service.resolve('T1', {type: 'page', id: 1}).then((resolved) => results.push(resolved));
    tick();
    flushMicrotasks();

    expect(post).toHaveBeenCalledOnceWith('/teams/T1/mentions/resolve', {mentions: [{type: 'page', id: 1}, {type: 'user', id: 2}]});
    expect(results).toEqual([
      {type: 'page', id: 1, status: 'ok', title: 'Spec'},
      {type: 'page', id: 1, status: 'ok', title: 'Spec'},
      {type: 'user', id: 2, status: 'removed', nickname: 'Ann'},
    ]);
  }));

  it('sends at most 200 refs per request', fakeAsync(() => {
    const post = spyOn(axiosInstance, 'post').and.returnValue(Promise.resolve({data: {mentions: []}}));

    for (let id = 1; id <= 201; id++) {
      service.resolve('T1', {type: 'page', id});
    }
    tick();

    expect(post).toHaveBeenCalledTimes(2);
    expect((post.calls.argsFor(1)[1] as { mentions: unknown[] }).mentions.length).toBe(1);
  }));

  it('resolves refs as failed when the request fails', fakeAsync(() => {
    spyOn(axiosInstance, 'post').and.callFake(() => Promise.reject(new AxiosError('offline')));
    let result: ResolvedMention | null = null;

    service.resolve('T1', {type: 'board', id: 3}).then((resolved) => result = resolved);
    tick();
    flushMicrotasks();

    expect(result!).toEqual({type: 'board', id: 3, status: 'failed'});
  }));
});
