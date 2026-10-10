import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {Toast, ToastType} from '@models/toast.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [
    TranslateModule,
    IconButtonComponent
  ],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) toast!: Toast;
  @Output() closed = new EventEmitter<void>();

  get role(): 'alert' | 'status' {
    return this.toast.type === ToastType.ERROR ? 'alert' : 'status';
  }
}
