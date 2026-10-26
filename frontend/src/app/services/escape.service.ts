import {Inject, Injectable, OnDestroy, DOCUMENT} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EscapeService implements OnDestroy {
  private handlers: (() => void)[] = [];
  private keydownSubscription: Subscription;

  constructor(@Inject(DOCUMENT) document: Document) {
    this.keydownSubscription = fromEvent<KeyboardEvent>(document, 'keydown')
      .subscribe((event) => this.handleKeydown(event));
  }

  ngOnDestroy() {
    this.keydownSubscription.unsubscribe();
  }

  push(handler: () => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((item) => item !== handler);
    };
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented) {
      return;
    }

    const handler = this.handlers[this.handlers.length - 1];
    if (!handler) {
      return;
    }

    event.preventDefault();
    handler();
  }
}
