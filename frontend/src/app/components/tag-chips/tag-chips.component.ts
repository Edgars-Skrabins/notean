import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Tag} from '@models/tag.model';
import {TagChipComponent} from '@components/tag-chip/tag-chip.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-tag-chips',
  imports: [
    NgFor,
    NgIf,
    TranslatePipe,
    TagChipComponent,
    TooltipDirective
  ],
  templateUrl: './tag-chips.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tag-chips.component.css'
})
export class TagChipsComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) tags: Tag[] = [];
  @Input({required: true}) tagIds: number[] = [];
  @Input({required: true}) max = 3;

  get ticketTags(): Tag[] {
    const ids = new Set(this.tagIds);
    return this.tags.filter((tag) => ids.has(tag.id));
  }

  get shownTags(): Tag[] {
    return this.ticketTags.slice(0, this.max);
  }

  get hiddenTags(): Tag[] {
    return this.ticketTags.slice(this.max);
  }

  get hiddenNames(): string {
    return this.hiddenTags.map((tag) => tag.name).join(', ');
  }

  trackById(_index: number, tag: Tag): number {
    return tag.id;
  }
}
