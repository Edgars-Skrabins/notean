import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {NgFor, NgIf} from "@angular/common";
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {MentionCandidate} from "@models/mention.model";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {IconComponent} from "@components/icon/icon.component";
import {mentionIcon} from "@utils/mentionChip";

let nextPickerId = 0;

@Component({
  selector: 'app-mention-picker',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    AvatarComponent,
    IconComponent
  ],
  templateUrl: './mention-picker.component.html',
  styleUrl: './mention-picker.component.css',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MentionPickerComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly pickerId = `mentionPicker${++nextPickerId}`;
  protected readonly mentionIcon = mentionIcon;

  @Input() results: MentionCandidate[] = [];
  @Input() activeIndex = 0;
  @Input() loading = false;
  @Output() pick = new EventEmitter<MentionCandidate>();
  @Output() hover = new EventEmitter<number>();

  optionId(index: number): string {
    return `${this.pickerId}-${index}`;
  }

  trackResult(_index: number, result: MentionCandidate): string {
    return `${result.type}:${result.id}`;
  }
}
