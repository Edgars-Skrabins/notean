import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {IMAGE_TYPES} from '@config/attachmentLimits';
import {defaultLanguage} from '@config/translationConfig';
import {Attachment} from '@models/attachment.model';
import {AttachmentService} from '@services/attachment.service';
import {IconComponent} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {formatBytes} from '@utils/formatBytes';
import {relativeDate} from '@utils/relativeDate';

@Component({
  selector: 'app-attachment-row',
  imports: [
    NgIf,
    TranslatePipe,
    IconComponent,
    IconButtonComponent
  ],
  templateUrl: './attachment-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './attachment-row.component.css'
})
export class AttachmentRowComponent implements OnChanges {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) teamCode!: string;
  @Input({required: true}) attachment!: Attachment;
  @Input() canDelete = false;
  @Output() opened = new EventEmitter<Attachment>();
  @Output() deleteRequested = new EventEmitter<Attachment>();

  previewUrl: string | null = null;

  constructor(private attachmentService: AttachmentService, private translateService: TranslateService) {
  }

  get isImage(): boolean {
    return IMAGE_TYPES.includes(this.attachment.contentType);
  }

  get details(): string {
    const locale = this.translateService.getCurrentLang() ?? this.translateService.getFallbackLang() ?? defaultLanguage;
    return [formatBytes(this.attachment.byteSize), this.attachment.uploader.nickname, relativeDate(this.attachment.createdAt, locale)].join(' · ');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attachment'] && this.isImage) {
      this.loadPreview();
    }
  }

  private async loadPreview() {
    const response = await this.attachmentService.objectUrl(this.teamCode, this.attachment.id);
    this.previewUrl = response.success ? response.url : null;
  }
}
