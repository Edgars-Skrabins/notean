import {Injectable} from '@angular/core';
import {axiosInstance} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {teamPath} from "@utils/teamPath";
import {mapAvatar, RawAvatar} from "@services/avatar.service";
import {
  Attachment,
  AttachmentKind,
  AttachmentResponse,
  AttachmentUrlResponse,
  DeleteAttachmentResponse,
  StorageUsageResponse
} from "@models/attachment.model";

export interface RawAttachment {
  id: number;
  filename: string;
  content_type: string;
  byte_size: number;
  kind: AttachmentKind;
  uploader: { id: number; nickname: string; avatar: RawAvatar };
  created_at: string;
}

export function mapAttachment(raw: RawAttachment): Attachment {
  return {
    id: raw.id,
    filename: raw.filename,
    contentType: raw.content_type,
    byteSize: raw.byte_size,
    kind: raw.kind,
    uploader: {id: raw.uploader.id, nickname: raw.uploader.nickname, avatar: mapAvatar(raw.uploader.avatar)},
    createdAt: raw.created_at,
  };
}

export type UploadProgress = (percent: number) => void;

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private objectUrls = new Map<number, Promise<AttachmentUrlResponse>>();

  async uploadToTicket(teamCode: string, boardId: number, ticketId: number, file: File, onProgress?: UploadProgress): Promise<AttachmentResponse> {
    return this.upload(teamPath(teamCode, 'boards', boardId, 'tickets', ticketId, 'attachments'), file, 'file', onProgress);
  }

  async uploadToPage(teamCode: string, pageId: number, file: File, kind: AttachmentKind, onProgress?: UploadProgress): Promise<AttachmentResponse> {
    return this.upload(teamPath(teamCode, 'pages', pageId, 'attachments'), file, kind, onProgress);
  }

  async uploadPending(teamCode: string, file: File, kind: AttachmentKind, onProgress?: UploadProgress): Promise<AttachmentResponse> {
    return this.upload(teamPath(teamCode, 'attachments'), file, kind, onProgress);
  }

  async deleteFromTicket(teamCode: string, boardId: number, ticketId: number, id: number): Promise<DeleteAttachmentResponse> {
    return this.remove(teamPath(teamCode, 'boards', boardId, 'tickets', ticketId, 'attachments', id), id);
  }

  async deleteFromPage(teamCode: string, pageId: number, id: number): Promise<DeleteAttachmentResponse> {
    return this.remove(teamPath(teamCode, 'pages', pageId, 'attachments', id), id);
  }

  async deletePending(teamCode: string, id: number): Promise<DeleteAttachmentResponse> {
    return this.remove(teamPath(teamCode, 'attachments', id), id);
  }

  objectUrl(teamCode: string, id: number): Promise<AttachmentUrlResponse> {
    let url = this.objectUrls.get(id);
    if (!url) {
      url = this.fetchBlob(teamCode, id).then((response) => response.success ? {success: true, url: URL.createObjectURL(response.blob)} : response);
      url.then((response) => {
        if (!response.success) {
          this.objectUrls.delete(id);
        }
      });
      this.objectUrls.set(id, url);
    }
    return url;
  }

  release(id: number) {
    const url = this.objectUrls.get(id);
    this.objectUrls.delete(id);
    url?.then((response) => {
      if (response.success) {
        URL.revokeObjectURL(response.url);
      }
    });
  }

  clear() {
    [...this.objectUrls.keys()].forEach((id) => this.release(id));
  }

  async download(teamCode: string, attachment: Attachment): Promise<DeleteAttachmentResponse> {
    const response = await this.fetchBlob(teamCode, attachment.id);
    if (!response.success) {
      return response;
    }
    const url = URL.createObjectURL(response.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    link.click();
    URL.revokeObjectURL(url);
    return {success: true};
  }

  async storageUsage(teamCode: string): Promise<StorageUsageResponse> {
    return apiRequest<StorageUsageResponse>(
      axiosInstance.get(teamPath(teamCode, 'storage_usage')),
      (data) => ({success: true, storage: {usedBytes: data.storage.used_bytes, quotaBytes: data.storage.quota_bytes}}),
    );
  }

  private async upload(url: string, file: File, kind: AttachmentKind, onProgress?: UploadProgress): Promise<AttachmentResponse> {
    const formData = new FormData();
    formData.append('attachment[file]', file);
    formData.append('attachment[kind]', kind);
    return apiRequest<AttachmentResponse>(
      axiosInstance.post(url, formData, {
        onUploadProgress: (event) => onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
      }),
      (data) => ({success: true, attachment: mapAttachment(data.attachment)}),
    );
  }

  private async remove(url: string, id: number): Promise<DeleteAttachmentResponse> {
    return apiRequest<DeleteAttachmentResponse>(
      axiosInstance.delete(url).then((response) => {
        this.release(id);
        return response;
      }),
      () => ({success: true}),
    );
  }

  private fetchBlob(teamCode: string, id: number) {
    return apiRequest<{ success: true; blob: Blob } | Exclude<AttachmentUrlResponse, { success: true }>>(
      axiosInstance.get(teamPath(teamCode, 'attachments', id, 'file'), {responseType: 'blob'}),
      (data) => ({success: true, blob: data as Blob}),
    );
  }
}
