import {Component, ElementRef, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {TranslatePipe} from '@ngx-translate/core';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {MenuButtonOption} from '@models/menu-button.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconComponent, IconName} from '@components/icon/icon.component';
import {TooltipDirective} from '@components/tooltip/tooltip.directive';

@Component({
  selector: 'app-menu-button',
  imports: [
    NgFor,
    NgIf,
    OverlayModule,
    TranslatePipe,
    AvatarComponent,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: './menu-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './menu-button.component.css'
})
export class MenuButtonComponent {
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;

  @Input() label = '';
  @Input({required: true}) options: MenuButtonOption[] = [];
  @Input() disabled = false;
  @Input() customTrigger = false;
  @Input() icon: IconName | null = null;
  @Output() picked = new EventEmitter<string | number | null>();

  isOpen = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  trackByValue(_index: number, option: MenuButtonOption): string | number | null {
    return option.value;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  close() {
    this.isOpen = false;
  }

  pick(option: MenuButtonOption) {
    this.close();
    this.picked.emit(option.value);
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.close();
  }

  private trigger(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector('.menuButton__origin');
  }
}
