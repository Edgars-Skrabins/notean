import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';

@Component({
  selector: 'app-load-more',
  imports: [
    TranslateModule
  ],
  templateUrl: './load-more.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './load-more.component.css'
})
export class LoadMoreComponent {
  protected readonly PHRASES = PHRASES;

  @Input() loading = false;
  @Output() pressed = new EventEmitter<void>();
}
