import {ComponentRef, Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy} from '@angular/core';
import {Overlay, OverlayRef} from '@angular/cdk/overlay';
import {ComponentPortal} from '@angular/cdk/portal';
import {TOOLTIP_POSITIONS} from '@config/overlayPositions';
import {TooltipComponent} from '@components/tooltip/tooltip.component';

const SHOW_DELAY_MS = 300;

@Directive({
  selector: '[appTooltip]'
})
export class TooltipDirective implements OnChanges, OnDestroy {
  @Input() appTooltip = '';

  private overlayRef: OverlayRef | null = null;
  private tooltipRef: ComponentRef<TooltipComponent> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private overlay: Overlay,
    private elementRef: ElementRef<HTMLElement>
  ) {
  }

  get isShown(): boolean {
    return !!this.tooltipRef;
  }

  ngOnChanges() {
    if (!this.appTooltip) {
      this.hide();
    } else {
      this.tooltipRef?.setInput('text', this.appTooltip);
    }
  }

  ngOnDestroy() {
    this.hide();
    this.overlayRef?.dispose();
  }

  @HostListener('mouseenter')
  handleMouseEnter() {
    if (!this.canShow() || this.showTimer || this.tooltipRef) {
      return;
    }
    this.showTimer = setTimeout(() => this.show(), SHOW_DELAY_MS);
  }

  @HostListener('focusin')
  handleFocusIn() {
    if (this.elementRef.nativeElement.matches(':focus-visible, :has(:focus-visible)')) {
      this.show();
    }
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  @HostListener('click')
  @HostListener('document:keydown.escape')
  hide() {
    this.clearTimer();
    if (this.tooltipRef) {
      this.overlayRef?.detach();
      this.tooltipRef = null;
    }
  }

  private show() {
    this.clearTimer();
    if (!this.canShow() || this.tooltipRef) {
      return;
    }
    this.tooltipRef = this.getOverlayRef().attach(new ComponentPortal(TooltipComponent));
    this.tooltipRef.setInput('text', this.appTooltip);
  }

  private canShow(): boolean {
    return !!this.appTooltip && !window.matchMedia('(hover: none)').matches;
  }

  private getOverlayRef(): OverlayRef {
    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy: this.overlay.position()
          .flexibleConnectedTo(this.elementRef)
          .withPositions(TOOLTIP_POSITIONS)
          .withViewportMargin(8)
          .withPush(true),
        scrollStrategy: this.overlay.scrollStrategies.close()
      });
    }
    return this.overlayRef;
  }

  private clearTimer() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
