import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {MenuButtonOption} from '@models/menu-button.model';
import {MenuButtonComponent} from '@components/menu-button/menu-button.component';
import {IconComponent, IconName} from '@components/icon/icon.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-split-button',
  imports: [
    NgIf,
    MenuButtonComponent,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './split-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './split-button.component.css'
})
export class SplitButtonComponent {
  @Input({required: true}) label!: string;
  @Input({required: true}) menuLabel!: string;
  @Input({required: true}) options: MenuButtonOption[] = [];
  @Input() icon: IconName | null = null;
  @Input() compact = false;
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
  @Output() picked = new EventEmitter<string | number | null>();
}
