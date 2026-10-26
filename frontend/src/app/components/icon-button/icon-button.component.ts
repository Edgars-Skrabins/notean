import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {IconComponent, IconName} from "@components/icon/icon.component";
import {TooltipDirective} from "@components/tooltip/tooltip.directive";

@Component({
  selector: 'app-icon-button',
  imports: [
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './icon-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './icon-button.component.css'
})
export class IconButtonComponent {
  @Input({required: true}) icon!: IconName;
  @Input({required: true}) tooltip!: string;
  @Input() variant: 'ghost' | 'danger' = 'ghost';
  @Input() size: 28 | 36 = 36;
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
}
