import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {TITLE_MAX_LENGTH} from '@config/contentLimits';
import {IconComponent, IconName} from '@components/icon/icon.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-item-tree-row',
  imports: [NgIf, FormsModule, TranslateModule, IconComponent, IconButtonComponent],
  templateUrl: './item-tree-row.component.html',
  styleUrl: './item-tree-row.component.css'
})
export class ItemTreeRowComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;

  @Input({required: true}) kind!: 'folder' | 'item';
  @Input({required: true}) icon!: IconName;
  @Input({required: true}) title!: string;
  @Input() expandable = false;
  @Input() expanded = false;
  @Input() renaming = false;
  @Input() renameDraft = '';

  @Output() activate = new EventEmitter<void>();
  @Output() renameDraftChange = new EventEmitter<string>();
  @Output() renameCommit = new EventEmitter<void>();
  @Output() renameCancel = new EventEmitter<void>();

  @ViewChild('renameInput')
  set renameInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (!input) {
      return;
    }

    setTimeout(() => {
      input.nativeElement.focus();
      input.nativeElement.select();
    });
  }
}
