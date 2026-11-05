import {fakeAsync, tick} from '@angular/core/testing';
import {LiveAnnouncer} from '@angular/cdk/a11y';
import {TranslateService} from '@ngx-translate/core';
import {ToastContainerComponent} from './toast-container.component';
import {TOAST_ACTION_DURATION_MS, TOAST_DURATION_MS, TOAST_EXIT_MS, ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';

describe('ToastContainerComponent', () => {
  let toastService: ToastService;
  let liveAnnouncer: jasmine.SpyObj<LiveAnnouncer>;
  let component: ToastContainerComponent;

  beforeEach(() => {
    toastService = new ToastService();
    liveAnnouncer = jasmine.createSpyObj<LiveAnnouncer>('LiveAnnouncer', ['announce']);
    const translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string | string[], params?: Record<string, unknown>) => (key as string).replace(/\{\{(\w+)\}\}/g, (_match, name) => String(params?.[name])));
    component = new ToastContainerComponent(toastService, liveAnnouncer, translateService);
  });

  afterEach(() => component.ngOnDestroy());

  it('announces an info toast politely once, even after further emissions', fakeAsync(() => {
    toastService.show({type: ToastType.INFO, message: 'MESSAGE'});
    toastService.show({type: ToastType.SUCCESS, message: 'OTHER'});
    tick(TOAST_DURATION_MS + TOAST_EXIT_MS);

    expect(liveAnnouncer.announce.calls.allArgs()).toEqual([['MESSAGE', 'polite'], ['OTHER', 'polite']]);
  }));

  it('announces an error toast assertively', fakeAsync(() => {
    toastService.show({type: ToastType.ERROR, message: 'OOPS'});

    expect(liveAnnouncer.announce).toHaveBeenCalledOnceWith('OOPS', 'assertive');

    tick(TOAST_DURATION_MS + TOAST_EXIT_MS);
  }));

  it('announces a toast with an action as its message followed by the action label', fakeAsync(() => {
    toastService.show({type: ToastType.SUCCESS, message: 'MOVED', action: {label: 'UNDO', run: () => undefined}});

    expect(liveAnnouncer.announce).toHaveBeenCalledOnceWith('MOVED. UNDO', 'polite');

    tick(TOAST_ACTION_DURATION_MS + TOAST_EXIT_MS);
  }));

  it('fills the message params into the announcement', fakeAsync(() => {
    toastService.show({type: ToastType.SUCCESS, message: "'{{title}}' MOVED", messageParams: {title: 'Notes'}, action: {label: 'UNDO', run: () => undefined}});

    expect(liveAnnouncer.announce).toHaveBeenCalledOnceWith("'Notes' MOVED. UNDO", 'polite');

    tick(TOAST_ACTION_DURATION_MS + TOAST_EXIT_MS);
  }));
});
