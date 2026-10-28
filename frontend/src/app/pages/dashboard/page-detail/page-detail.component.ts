import {Component, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslateService} from "@ngx-translate/core";
import {NgIf} from '@angular/common';
import {PageService} from "@services/page.service";
import {PageEditingService} from "@services/page-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {FavoriteService} from "@services/favorite.service";
import {ToastService} from "@services/toast.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {FolderService} from "@services/folder.service";
import {TemplateService} from "@services/template.service";
import {TrashService} from "@services/trash.service";
import {CopyLinkService} from "@services/copy-link.service";
import {AttachmentService} from "@services/attachment.service";
import {PHRASES} from "@config/phrases";
import {ATTACHMENT_MAX_BYTES} from "@config/attachmentLimits";
import {AppRoutes} from "../../../app/app-routes.enum";
import {Attachment, AttachmentKind, AttachmentResponse, AttachmentUpload} from "@models/attachment.model";
import {CreateFolderedItemParams} from "@models/foldered-item.model";
import {ToastType} from "@models/toast.model";
import {RichTextEditorComponent} from "@components/rich-text-editor/rich-text-editor.component";
import {ItemDetailLayoutComponent} from "@components/item-detail-layout/item-detail-layout.component";
import {CommentListComponent} from "@components/comment-list/comment-list.component";
import {CommentTarget} from "@models/comment.model";
import {AttachmentListComponent} from "@components/attachment-list/attachment-list.component";
import {droppedFiles, hasDraggedFiles, pastedFiles} from "@utils/fileDrop";
import {errorPhrase} from "@utils/errorPhrase";
import {FolderedItemDetailComponent} from "../foldered-item-detail.base";

@Component({
  selector: 'app-page-detail',
  imports: [
    NgIf,
    RichTextEditorComponent,
    ItemDetailLayoutComponent,
    CommentListComponent,
    AttachmentListComponent
  ],
  templateUrl: './page-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './page-detail.component.css'
})
export class PageDetailComponent extends FolderedItemDetailComponent implements OnDestroy {
  protected readonly favoriteType = 'Page';
  protected readonly itemType = 'Page';
  protected readonly listRoute = AppRoutes.DOCUMENT_PAGES;
  protected readonly untitledItemPhrase = PHRASES.UNTITLED_PAGE;
  protected readonly templateKind = 'page';
  protected readonly notFoundCode = 'PAGE_NOT_FOUND';

  private pageCommentTarget: Extract<CommentTarget, { type: 'page' }> | null = null;

  get commentTarget(): CommentTarget | null {
    const pageId = this.item?.id;
    if (pageId === undefined) {
      return null;
    }
    if (this.pageCommentTarget?.pageId !== pageId) {
      this.pageCommentTarget = {type: 'page', pageId};
    }
    return this.pageCommentTarget;
  }

  uploads: AttachmentUpload[] = [];
  pendingFiles: Attachment[] = [];

  private pendingImageIds: number[] = [];
  private uploadKey = 0;

  constructor(
    route: ActivatedRoute,
    pageService: PageService,
    pageEditingService: PageEditingService,
    teamService: TeamService,
    authService: AuthService,
    navigationService: NavigationService,
    favoriteService: FavoriteService,
    toastService: ToastService,
    projectFilterService: ProjectFilterService,
    folderService: FolderService,
    translateService: TranslateService,
    copyLinkService: CopyLinkService,
    trashService: TrashService,
    private attachmentService: AttachmentService,
    templateService: TemplateService
  ) {
    super(route, pageService, pageEditingService, teamService, authService, navigationService, favoriteService, toastService, projectFilterService, folderService, translateService, copyLinkService, trashService, templateService);
  }

  get attachments(): Attachment[] {
    return this.mode === 'create' ? this.pendingFiles : this.item?.attachments ?? [];
  }

  override get hasCreateDraftChanges(): boolean {
    return super.hasCreateDraftChanges || this.pendingFiles.length > 0 || this.pendingImageIds.length > 0;
  }

  readonly uploadImage = async (file: File): Promise<number | null> => {
    const response = await this.upload(file, 'inline');
    if (!response?.success) {
      return null;
    }
    this.pendingImageIds.push(response.attachment.id);
    return response.attachment.id;
  };

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (!this.isCreated) {
      this.pendingFiles.forEach((attachment) => this.attachmentService.deletePending(this.teamCode, attachment.id));
    }
    this.discardUnusedImages(this.isCreated ? this.draftContent : '');
  }

  handleDragOver(event: DragEvent) {
    if (hasDraggedFiles(event)) {
      event.preventDefault();
    }
  }

  handleDrop(event: DragEvent) {
    const files = droppedFiles(event);
    if (!event.defaultPrevented && files.length) {
      event.preventDefault();
      this.uploadFiles(files);
    }
  }

  handlePaste(event: ClipboardEvent) {
    const files = pastedFiles(event);
    if (!event.defaultPrevented && files.length) {
      event.preventDefault();
      this.uploadFiles(files);
    }
  }

  uploadFiles(files: File[]) {
    files.forEach(async (file) => {
      const response = await this.upload(file, 'file');
      if (!response?.success) {
        return;
      }
      if (this.mode === 'create') {
        this.pendingFiles = [response.attachment, ...this.pendingFiles];
      } else if (this.item) {
        this.item = {...this.item, attachments: [response.attachment, ...this.item.attachments]};
      }
    });
  }

  handleDeleteAttachment(attachment: Attachment) {
    const request = this.mode === 'create'
      ? this.attachmentService.deletePending(this.teamCode, attachment.id)
      : this.attachmentService.deleteFromPage(this.teamCode, this.item!.id, attachment.id);
    request.then((response) => {
      if (!response.success) {
        this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
        return;
      }
      if (this.mode === 'create') {
        this.pendingFiles = this.pendingFiles.filter((item) => item.id !== attachment.id);
      } else if (this.item) {
        this.item = {...this.item, attachments: this.item.attachments.filter((item) => item.id !== attachment.id)};
      }
    });
  }

  protected override createExtras(): Partial<CreateFolderedItemParams> {
    return {attachmentIds: this.pendingFiles.map((attachment) => attachment.id)};
  }

  protected override afterEditEnded() {
    this.discardUnusedImages(this.item?.content ?? '');
  }

  private async upload(file: File, kind: AttachmentKind): Promise<AttachmentResponse | null> {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase('FILE_TOO_LARGE')});
      return null;
    }

    const upload: AttachmentUpload = {key: ++this.uploadKey, filename: file.name, progress: 0};
    if (kind === 'file') {
      this.uploads = [...this.uploads, upload];
    }
    const onProgress = (progress: number) => {
      upload.progress = progress;
    };
    const response = kind === 'inline' || this.mode === 'create' || !this.item
      ? await this.attachmentService.uploadPending(this.teamCode, file, kind, onProgress)
      : await this.attachmentService.uploadToPage(this.teamCode, this.item.id, file, kind, onProgress);
    this.uploads = this.uploads.filter((item) => item !== upload);

    if (!response.success) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
    }
    return response;
  }

  private discardUnusedImages(content: string) {
    const unused = this.pendingImageIds.filter((id) => !content.includes(`data-attachment-id="${id}"`));
    unused.forEach((id) => this.attachmentService.deletePending(this.teamCode, id));
    this.pendingImageIds = [];
  }
}
