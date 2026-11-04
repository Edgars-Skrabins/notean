import {fakeAsync, tick} from '@angular/core/testing';
import {MAX_VISIBLE_TOASTS, TOAST_ACTION_DURATION_MS, TOAST_DURATION_MS, TOAST_EXIT_MS, ToastService} from './toast.service';
import {Toast, ToastType} from '@models/toast.model';

describe('ToastService', () => {
  let service: ToastService;
  let toasts: Toast[];

  beforeEach(() => {
    service = new ToastService();
    service.toasts$.subscribe((value) => toasts = value);
  });

  it('adds a toast to the top of the list', fakeAsync(() => {
    service.show({type: ToastType.INFO, message: 'FIRST'});
    service.show({type: ToastType.SUCCESS, message: 'SECOND'});

    expect(toasts.map((toast) => toast.message)).toEqual(['SECOND', 'FIRST']);
    expect(toasts.every((toast) => !toast.leaving)).toBeTrue();

    tick(TOAST_DURATION_MS + TOAST_EXIT_MS);
  }));

  it('marks a toast as leaving after the duration and removes it after the exit animation', fakeAsync(() => {
    service.show({type: ToastType.INFO, message: 'HELLO'});

    tick(TOAST_DURATION_MS);
    expect(toasts.length).toBe(1);
    expect(toasts[0].leaving).toBeTrue();

    tick(TOAST_EXIT_MS);
    expect(toasts).toEqual([]);
  }));

  it('keeps a toast with an action for the longer duration', fakeAsync(() => {
    service.show({type: ToastType.SUCCESS, message: 'MOVED', action: {label: 'UNDO', run: () => undefined}});

    tick(TOAST_DURATION_MS);
    expect(toasts[0].leaving).toBeFalse();

    tick(TOAST_ACTION_DURATION_MS - TOAST_DURATION_MS);
    expect(toasts[0].leaving).toBeTrue();

    tick(TOAST_EXIT_MS);
  }));

  it('dismisses the oldest toast when more than the maximum are showing', fakeAsync(() => {
    for (let index = 0; index <= MAX_VISIBLE_TOASTS; index++) {
      service.show({type: ToastType.INFO, message: `TOAST_${index}`});
    }

    const oldest = toasts.find((toast) => toast.message === 'TOAST_0')!;
    expect(oldest.leaving).toBeTrue();
    expect(toasts.filter((toast) => !toast.leaving).length).toBe(MAX_VISIBLE_TOASTS);

    tick(TOAST_DURATION_MS + TOAST_EXIT_MS);
  }));

  it('dismiss removes a toast early and ignores repeated calls', fakeAsync(() => {
    service.show({type: ToastType.ERROR, message: 'OOPS'});
    const id = toasts[0].id;

    service.dismiss(id);
    service.dismiss(id);
    tick(TOAST_EXIT_MS);
    expect(toasts).toEqual([]);

    service.dismiss(id);
    expect(toasts).toEqual([]);

    tick(TOAST_DURATION_MS);
  }));

  it('keeps a paused toast and lets it leave after the remaining time once resumed', fakeAsync(() => {
    service.show({type: ToastType.INFO, message: 'HELLO'});
    const id = toasts[0].id;

    tick(1000);
    service.pause(id);
    tick(TOAST_DURATION_MS + 5000);
    expect(toasts[0].leaving).toBeFalse();

    service.resume(id);
    tick(TOAST_DURATION_MS - 1000 - 1);
    expect(toasts[0].leaving).toBeFalse();

    tick(1);
    expect(toasts[0].leaving).toBeTrue();

    tick(TOAST_EXIT_MS);
    expect(toasts).toEqual([]);
  }));

  it('resumes an action toast with its own remaining time', fakeAsync(() => {
    service.show({type: ToastType.SUCCESS, message: 'MOVED', action: {label: 'UNDO', run: () => undefined}});
    const id = toasts[0].id;

    tick(4000);
    service.pause(id);
    tick(10000);
    service.resume(id);

    tick(TOAST_ACTION_DURATION_MS - 4000 - 1);
    expect(toasts[0].leaving).toBeFalse();

    tick(1);
    expect(toasts[0].leaving).toBeTrue();

    tick(TOAST_EXIT_MS);
  }));

  it('ignores pause and resume for unknown or leaving toasts', fakeAsync(() => {
    expect(() => {
      service.pause(999);
      service.resume(999);
    }).not.toThrow();

    service.show({type: ToastType.INFO, message: 'HELLO'});
    const id = toasts[0].id;
    service.dismiss(id);
    service.pause(id);
    service.resume(id);
    expect(toasts[0].leaving).toBeTrue();

    tick(TOAST_EXIT_MS);
    expect(toasts).toEqual([]);

    service.resume(id);
    tick(TOAST_DURATION_MS);
    expect(toasts).toEqual([]);
  }));
});
