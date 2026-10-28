import {AxiosError, AxiosRequestConfig} from "axios";
import {AttachmentService, mapAttachment, RawAttachment} from "./attachment.service";
import {axiosInstance} from "@config/axiosConfig";

const raw: RawAttachment = {
  id: 7,
  filename: 'notes.txt',
  content_type: 'text/plain',
  byte_size: 14,
  kind: 'file',
  uploader: {id: 2, nickname: 'Alice', avatar: {color: 'blue', image_url: null}},
  created_at: '2026-10-28T10:00:00Z',
};

describe('mapAttachment', () => {
  it('maps snake_case fields to camelCase', () => {
    expect(mapAttachment(raw)).toEqual({
      id: 7,
      filename: 'notes.txt',
      contentType: 'text/plain',
      byteSize: 14,
      kind: 'file',
      uploader: {id: 2, nickname: 'Alice', avatar: {color: 'blue', imageUrl: null}},
      createdAt: '2026-10-28T10:00:00Z',
    });
  });
});

describe('AttachmentService', () => {
  let service: AttachmentService;

  beforeEach(() => {
    service = new AttachmentService();
  });

  it('uploads a ticket file as form data and reports progress', async () => {
    const post = spyOn(axiosInstance, 'post').and.callFake(((_url: string, _data: unknown, config: AxiosRequestConfig) => {
      config.onUploadProgress!({loaded: 5, total: 10} as never);
      return Promise.resolve({data: {attachment: raw}});
    }) as never);
    const progress = jasmine.createSpy('progress');
    const file = new File(['x'], 'notes.txt', {type: 'text/plain'});

    const response = await service.uploadToTicket('ABC', 3, 4, file, progress);

    const [url, formData] = post.calls.mostRecent().args as [string, FormData];
    expect(url).toBe('/teams/ABC/boards/3/tickets/4/attachments');
    expect(formData.get('attachment[file]')).toEqual(file);
    expect(formData.get('attachment[kind]')).toBe('file');
    expect(progress).toHaveBeenCalledWith(50);
    expect(response).toEqual({success: true, attachment: mapAttachment(raw)});
  });

  it('returns the error code when an upload is rejected', async () => {
    spyOn(axiosInstance, 'post').and.returnValue(Promise.reject(new AxiosError('x', '422', undefined, undefined, {status: 422, data: {code: 'STORAGE_QUOTA_EXCEEDED'}} as never)));

    const response = await service.uploadPending('ABC', new File(['x'], 'a.png'), 'inline');

    expect(response).toEqual({success: false, code: 'STORAGE_QUOTA_EXCEEDED'});
  });

  it('fetches each image once and revokes its URL on release', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: new Blob(['x'])}));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:one');
    const revoke = spyOn(URL, 'revokeObjectURL');

    const first = await service.objectUrl('ABC', 7);
    const second = await service.objectUrl('ABC', 7);
    service.release(7);
    await Promise.resolve();

    expect(get).toHaveBeenCalledOnceWith('/teams/ABC/attachments/7/file', {responseType: 'blob'});
    expect(first).toEqual({success: true, url: 'blob:one'});
    expect(second).toEqual(first);
    expect(revoke).toHaveBeenCalledWith('blob:one');
  });

  it('retries an image whose fetch failed', async () => {
    const get = spyOn(axiosInstance, 'get').and.returnValues(
      Promise.reject(new AxiosError('x', '404', undefined, undefined, {status: 404, data: {}} as never)),
      Promise.resolve({data: new Blob(['x'])}),
    );
    spyOn(URL, 'createObjectURL').and.returnValue('blob:two');

    const failed = await service.objectUrl('ABC', 8);
    const retried = await service.objectUrl('ABC', 8);

    expect(failed.success).toBeFalse();
    expect(retried).toEqual({success: true, url: 'blob:two'});
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('deleting an attachment releases its cached image', async () => {
    spyOn(axiosInstance, 'delete').and.returnValue(Promise.resolve({data: {}}));
    const release = spyOn(service, 'release');

    const response = await service.deleteFromPage('ABC', 5, 7);

    expect(response).toEqual({success: true});
    expect(release).toHaveBeenCalledWith(7);
  });
});
