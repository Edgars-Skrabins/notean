import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Tag} from '@models/tag.model';
import {IconComponent} from '@components/icon/icon.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-tag-chip',
  imports: [
    NgIf,
    TranslatePipe,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './tag-chip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tag-chip.component.css'
})
export class TagChipComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) tag!: Pick<Tag, 'name' | 'color'>;
  @Input() removable = false;
  @Input() disabled = false;
  @Output() remove = new EventEmitter<void>();
}
