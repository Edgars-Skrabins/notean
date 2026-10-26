import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';

@Component({
  selector: 'app-load-more',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './load-more.component.html',
  styleUrl: './load-more.component.css'
})
export class LoadMoreComponent {
  protected readonly PHRASES = PHRASES;

  @Input() loading = false;
  @Output() pressed = new EventEmitter<void>();
}
