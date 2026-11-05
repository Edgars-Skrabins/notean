import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgFor} from '@angular/common';
import {LiveAnnouncer} from '@angular/cdk/a11y';
import {TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';
import {ToastService} from '@services/toast.service';
import {Toast, ToastType} from '@models/toast.model';
import {ToastComponent} from '@components/toast/toast.component';

@Component({
  selector: 'app-toast-container',
  imports: [
    AsyncPipe,
    NgFor,
    ToastComponent
  ],
  templateUrl: './toast-container.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast-container.component.css'
})
export class ToastContainerComponent implements OnDestroy {
  private announcedIds = new Set<number>();
  private subscription: Subscription;

  constructor(protected toastService: ToastService, private liveAnnouncer: LiveAnnouncer, private translateService: TranslateService) {
    this.subscription = this.toastService.toasts$.subscribe((toasts) => this.announce(toasts));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackById(_index: number, toast: Toast) {
    return toast.id;
  }

  private announce(toasts: Toast[]) {
    const currentIds = new Set(toasts.map((toast) => toast.id));
    this.announcedIds.forEach((id) => {
      if (!currentIds.has(id)) {
        this.announcedIds.delete(id);
      }
    });

    toasts
      .filter((toast) => !toast.leaving && !this.announcedIds.has(toast.id))
      .reverse()
      .forEach((toast) => {
        this.announcedIds.add(toast.id);
        this.liveAnnouncer.announce(this.announcementText(toast), toast.type === ToastType.ERROR ? 'assertive' : 'polite');
      });
  }

  private announcementText(toast: Toast) {
    const message = this.translateService.instant(toast.message, toast.messageParams);
    return toast.action ? `${message}. ${this.translateService.instant(toast.action.label)}` : message;
  }
}
