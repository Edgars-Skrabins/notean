import {Component} from '@angular/core';
import {AsyncPipe, NgFor} from '@angular/common';
import {ToastService} from '@services/toast.service';
import {Toast} from '@models/toast.model';
import {ToastComponent} from '@components/toast/toast.component';

@Component({
  selector: 'app-toast-container',
  imports: [
    AsyncPipe,
    NgFor,
    ToastComponent
  ],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent {
  constructor(protected toastService: ToastService) {
  }

  trackById(_index: number, toast: Toast) {
    return toast.id;
  }
}
