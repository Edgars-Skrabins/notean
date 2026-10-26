import {Component, ElementRef, EventEmitter, Input, Output} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {TranslateModule} from '@ngx-translate/core';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {DropdownOption} from '@models/dropdown.model';
import {IconComponent} from '@components/icon/icon.component';

let nextDropdownId = 0;

@Component({
  selector: 'app-dropdown',
  imports: [
    NgFor,
    NgIf,
    OverlayModule,
    TranslateModule,
    IconComponent
  ],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css'
})
export class DropdownComponent {
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;
  protected readonly id = `dropdown-${nextDropdownId++}`;

  @Input({required: true}) options: DropdownOption[] = [];
  @Input() value: string | number | null = null;
  @Input() ariaLabel = '';
  @Input() size: 'md' | 'sm' = 'md';
  @Output() valueChange = new EventEmitter<string | number | null>();

  isOpen = false;
  activeIndex = -1;
  triggerWidth = 0;

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  get selectedOption(): DropdownOption | undefined {
    return this.options.find((option) => option.value === this.value);
  }

  trackByValue(_index: number, option: DropdownOption): string | number | null {
    return option.value;
  }

  optionId(index: number): string | null {
    return index < 0 ? null : `${this.id}-option-${index}`;
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.triggerWidth = this.trigger()?.getBoundingClientRect().width ?? 0;
    this.activeIndex = Math.max(this.options.findIndex((option) => option.value === this.value), 0);
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  select(option: DropdownOption) {
    this.close();
    if (option.value !== this.value) {
      this.valueChange.emit(option.value);
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (!this.isOpen) {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.setActive(Math.min(this.activeIndex + 1, this.options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.setActive(Math.max(this.activeIndex - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        this.setActive(0);
        break;
      case 'End':
        event.preventDefault();
        this.setActive(this.options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.options[this.activeIndex]) {
          this.select(this.options[this.activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger()?.focus();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.close();
  }

  private setActive(index: number) {
    this.activeIndex = index;
    const id = this.optionId(index);
    if (id) {
      document.getElementById(id)?.scrollIntoView({block: 'nearest'});
    }
  }

  private trigger(): HTMLButtonElement | null {
    return this.elementRef.nativeElement.querySelector('.dropdown__trigger');
  }
}
