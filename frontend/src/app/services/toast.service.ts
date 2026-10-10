import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {Toast, ToastOptions} from '@models/toast.model';

export const TOAST_DURATION_MS = 3000;
export const TOAST_EXIT_MS = 250;
export const MAX_VISIBLE_TOASTS = 3;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  private nextId = 1;

  readonly toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  show(options: ToastOptions) {
    const toast: Toast = {...options, id: this.nextId++, leaving: false};
    this.toastsSubject.next([toast, ...this.toastsSubject.value]);

    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS);

    const visible = this.toastsSubject.value.filter((item) => !item.leaving);
    if (visible.length > MAX_VISIBLE_TOASTS) {
      this.dismiss(visible[visible.length - 1].id);
    }
  }

  dismiss(id: number) {
    const toast = this.toastsSubject.value.find((item) => item.id === id);
    if (!toast || toast.leaving) {
      return;
    }

    this.toastsSubject.next(this.toastsSubject.value.map((item) => item.id === id ? {...item, leaving: true} : item));

    setTimeout(() => {
      this.toastsSubject.next(this.toastsSubject.value.filter((item) => item.id !== id));
    }, TOAST_EXIT_MS);
  }
}
