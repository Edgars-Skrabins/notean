import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {NgFor} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {PRIORITY_COLORS, PriorityColor} from '@models/priority.model';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

const COLOR_PHRASES: Record<PriorityColor, string> = {
  grey: PHRASES.COLOR_LIGHT_GREY,
  blue: PHRASES.COLOR_BLUE,
  teal: PHRASES.COLOR_CYAN,
  green: PHRASES.COLOR_GREEN,
  yellow: PHRASES.COLOR_YELLOW,
  orange: PHRASES.COLOR_ORANGE,
  red: PHRASES.COLOR_RED,
  purple: PHRASES.COLOR_PURPLE,
};

@Component({
  selector: 'app-priority-color-picker',
  imports: [
    NgFor,
    OverlayModule,
    TranslateModule,
    TooltipDirective
  ],
  templateUrl: './priority-color-picker.component.html',
  styleUrl: './priority-color-picker.component.css'
})
export class PriorityColorPickerComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;
  protected readonly COLORS = PRIORITY_COLORS;
  protected readonly COLOR_PHRASES = COLOR_PHRASES;

  @Input({required: true}) color!: PriorityColor;
  @Input() disabled = false;
  @Output() colorChange = new EventEmitter<PriorityColor>();

  isOpen = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  pick(color: PriorityColor) {
    this.close();
    if (color !== this.color) {
      this.colorChange.emit(color);
    }
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.close();
  }

  private trigger(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.priorityColorPicker__trigger');
  }
}
