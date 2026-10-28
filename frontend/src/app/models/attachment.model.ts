import {Result} from "@models/result.model";
import {AttachmentsErrorCode, BoardsErrorCode, PagesErrorCode, TeamAccessErrorCode, TicketsErrorCode} from "@config/errorCodes";
import {Avatar} from "@models/avatar.model";

export type AttachmentKind = 'file' | 'inline';

export interface AttachmentUploader {
  id: number;
  nickname: string;
  avatar: Avatar;
}

export interface Attachment {
  id: number;
  filename: string;
  contentType: string;
  byteSize: number;
  kind: AttachmentKind;
  uploader: AttachmentUploader;
  createdAt: string;
}

export interface AttachmentUpload {
  key: number;
  filename: string;
  progress: number;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
}

export type AttachmentErrorCode = TeamAccessErrorCode | BoardsErrorCode | TicketsErrorCode | PagesErrorCode | AttachmentsErrorCode;

export type AttachmentResponse = Result<{ attachment: Attachment }, AttachmentErrorCode>;

export type DeleteAttachmentResponse = Result<object, AttachmentErrorCode>;

export type AttachmentUrlResponse = Result<{ url: string }, AttachmentErrorCode>;

export type StorageUsageResponse = Result<{ storage: StorageUsage }, TeamAccessErrorCode>;
