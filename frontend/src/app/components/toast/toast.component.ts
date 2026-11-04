import {Component, ElementRef, EventEmitter, HostListener, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {NgIf} from '@angular/common';
import {Toast, ToastAction} from '@models/toast.model';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';

@Component({
  selector: 'app-toast',
  imports: [
    NgIf,
    TranslatePipe,
    IconButtonComponent
  ],
  templateUrl: './toast.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) toast!: Toast;
  @Output() closed = new EventEmitter<void>();
  @Output() paused = new EventEmitter<void>();
  @Output() resumed = new EventEmitter<void>();

  private isHovered = false;
  private hasFocus = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  @HostListener('mouseenter')
  handleMouseEnter() {
    this.setHold(true, this.hasFocus);
  }

  @HostListener('mouseleave')
  handleMouseLeave() {
    this.setHold(false, this.hasFocus);
  }

  @HostListener('focusin')
  handleFocusIn() {
    this.setHold(this.isHovered, true);
  }

  @HostListener('focusout', ['$event'])
  handleFocusOut(event: FocusEvent) {
    if (event.relatedTarget instanceof Node && this.elementRef.nativeElement.contains(event.relatedTarget)) {
      return;
    }
    this.setHold(this.isHovered, false);
  }

  act(action: ToastAction) {
    action.run();
    this.closed.emit();
  }

  private setHold(isHovered: boolean, hasFocus: boolean) {
    const wasHeld = this.isHovered || this.hasFocus;
    this.isHovered = isHovered;
    this.hasFocus = hasFocus;
    const isHeld = isHovered || hasFocus;

    if (isHeld && !wasHeld) {
      this.paused.emit();
    } else if (!isHeld && wasHeld) {
      this.resumed.emit();
    }
  }
}
