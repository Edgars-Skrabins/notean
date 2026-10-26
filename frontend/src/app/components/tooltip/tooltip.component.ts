import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tooltip.component.css'
})
export class TooltipComponent {
  @Input({required: true}) text = '';
}
