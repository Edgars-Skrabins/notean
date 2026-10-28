import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Attachment} from '@models/attachment.model';
import {AttachmentService} from '@services/attachment.service';
import {EscapeService} from '@services/escape.service';
import {ButtonComponent} from '@components/button/button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-attachment-preview',
  imports: [
    NgIf,
    TranslatePipe,
    ButtonComponent,
    IconButtonComponent
  ],
  templateUrl: './attachment-preview.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './attachment-preview.component.css'
})
export class AttachmentPreviewComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) teamCode!: string;
  @Input({required: true}) attachment!: Attachment;
  @Output() closed = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<Attachment>();

  imageUrl: string | null = null;

  private unregisterEscape = () => {};

  constructor(private attachmentService: AttachmentService, private escapeService: EscapeService) {
  }

  async ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.closed.emit());
    const response = await this.attachmentService.objectUrl(this.teamCode, this.attachment.id);
    this.imageUrl = response.success ? response.url : null;
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }
}
