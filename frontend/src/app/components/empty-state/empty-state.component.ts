import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  imports: [
    NgIf,
    TranslatePipe
  ],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './empty-state.component.css'
})
export class EmptyStateComponent {
  @Input({required: true}) title!: string;
  @Input() titleParams: Record<string, string | number> = {};
  @Input() hint = '';
  @Input() hintParams: Record<string, string | number> = {};
}
