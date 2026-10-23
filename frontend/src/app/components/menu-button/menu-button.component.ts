import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {TranslateModule} from '@ngx-translate/core';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {MenuButtonOption} from '@models/menu-button.model';
import {AvatarComponent} from '@components/avatar/avatar.component';
import {IconComponent} from '@components/icon/icon.component';

@Component({
  selector: 'app-menu-button',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    OverlayModule,
    TranslateModule,
    AvatarComponent,
    IconComponent
  ],
  templateUrl: './menu-button.component.html',
  styleUrl: './menu-button.component.css'
})
export class MenuButtonComponent {
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;

  @Input({required: true}) label!: string;
  @Input({required: true}) options: MenuButtonOption[] = [];
  @Input() disabled = false;
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

  private trigger(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.menuButton__trigger');
  }
}
