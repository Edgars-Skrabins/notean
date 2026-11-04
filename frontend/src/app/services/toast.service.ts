import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {Toast, ToastOptions} from '@models/toast.model';

export const TOAST_DURATION_MS = 3000;
export const TOAST_ACTION_DURATION_MS = 6000;
export const TOAST_EXIT_MS = 250;
export const MAX_VISIBLE_TOASTS = 3;

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  private timers = new Map<number, ToastTimer>();
  private nextId = 1;

  readonly toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  show(options: ToastOptions) {
    const toast: Toast = {...options, id: this.nextId++, leaving: false};
    this.toastsSubject.next([toast, ...this.toastsSubject.value]);

    this.timers.set(toast.id, {handle: null, remainingMs: options.action ? TOAST_ACTION_DURATION_MS : TOAST_DURATION_MS, startedAt: 0});
    this.resume(toast.id);

    const visible = this.toastsSubject.value.filter((item) => !item.leaving);
    if (visible.length > MAX_VISIBLE_TOASTS) {
      this.dismiss(visible[visible.length - 1].id);
    }
  }

  pause(id: number) {
    const timer = this.timers.get(id);
    if (!timer || timer.handle === null) {
      return;
    }

    clearTimeout(timer.handle);
    timer.handle = null;
    timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt));
  }

  resume(id: number) {
    const timer = this.timers.get(id);
    if (!timer || timer.handle !== null) {
      return;
    }

    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remainingMs);
  }

  dismiss(id: number) {
    const toast = this.toastsSubject.value.find((item) => item.id === id);
    if (!toast || toast.leaving) {
      return;
    }

    const timer = this.timers.get(id);
    if (timer?.handle) {
      clearTimeout(timer.handle);
    }
    this.timers.delete(id);

    this.toastsSubject.next(this.toastsSubject.value.map((item) => item.id === id ? {...item, leaving: true} : item));

    setTimeout(() => {
      this.toastsSubject.next(this.toastsSubject.value.filter((item) => item.id !== id));
    }, TOAST_EXIT_MS);
  }
}
