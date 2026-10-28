import {Component, ElementRef, EventEmitter, Input, Output, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {IMAGE_TYPES} from '@config/attachmentLimits';
import {Attachment, AttachmentUpload} from '@models/attachment.model';
import {ToastType} from '@models/toast.model';
import {AttachmentService} from '@services/attachment.service';
import {AuthService} from '@services/auth.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {ButtonComponent} from '@components/button/button.component';
import {IconComponent} from '@components/icon/icon.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {AttachmentRowComponent} from '@components/attachment-row/attachment-row.component';
import {AttachmentPreviewComponent} from '@components/attachment-preview/attachment-preview.component';
import {errorPhrase} from '@utils/errorPhrase';

@Component({
  selector: 'app-attachment-list',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    ButtonComponent,
    IconComponent,
    ConfirmDialogComponent,
    AttachmentRowComponent,
    AttachmentPreviewComponent
  ],
  templateUrl: './attachment-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './attachment-list.component.css'
})
export class AttachmentListComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) teamCode!: string;
  @Input() attachments: Attachment[] = [];
  @Input() uploads: AttachmentUpload[] = [];
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() deleteConfirmed = new EventEmitter<Attachment>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  previewed: Attachment | null = null;
  pendingDelete: Attachment | null = null;

  constructor(
    private attachmentService: AttachmentService,
    private authService: AuthService,
    private teamService: TeamService,
    private toastService: ToastService,
  ) {
  }

  get isEmpty(): boolean {
    return this.attachments.length === 0 && this.uploads.length === 0;
  }

  canDelete(attachment: Attachment): boolean {
    const role = this.teamService.getCurrentRole();
    return role === 'admin' || role === 'owner' || attachment.uploader.id === this.authService.getCurrentUser()?.id;
  }

  openPicker() {
    this.fileInput?.nativeElement.click();
  }

  handlePicked(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) {
      this.filesSelected.emit(files);
    }
  }

  handleOpen(attachment: Attachment) {
    if (IMAGE_TYPES.includes(attachment.contentType)) {
      this.previewed = attachment;
    } else {
      this.download(attachment);
    }
  }

  async download(attachment: Attachment) {
    const response = await this.attachmentService.download(this.teamCode, attachment);
    if (!response.success) {
      this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
    }
  }

  confirmDelete() {
    if (this.pendingDelete) {
      this.deleteConfirmed.emit(this.pendingDelete);
    }
    this.pendingDelete = null;
  }
}
