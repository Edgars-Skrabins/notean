import {Component, ElementRef, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {CdkConnectedOverlay, OverlayModule} from '@angular/cdk/overlay';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {DROPDOWN_POSITIONS} from '@config/overlayPositions';
import {Tag, TAG_NAME_MAX_LENGTH} from '@models/tag.model';
import {CheckboxComponent} from '@components/checkbox/checkbox.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {TagChipComponent} from '@components/tag-chip/tag-chip.component';

@Component({
  selector: 'app-ticket-tags',
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    OverlayModule,
    TranslatePipe,
    CheckboxComponent,
    IconButtonComponent,
    TagChipComponent
  ],
  templateUrl: './ticket-tags.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './ticket-tags.component.css'
})
export class TicketTagsComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly DROPDOWN_POSITIONS = DROPDOWN_POSITIONS;
  protected readonly TAG_NAME_MAX_LENGTH = TAG_NAME_MAX_LENGTH;

  @Input({required: true}) tags: Tag[] = [];
  @Input({required: true}) tagIds: number[] = [];
  @Input() busy = false;
  @Output() add = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();
  @Output() create = new EventEmitter<string>();

  isPickerOpen = false;
  searchQuery = '';

  constructor(private elementRef: ElementRef<HTMLElement>) {
  }

  get ticketTags(): Tag[] {
    const ids = new Set(this.tagIds);
    return this.tags.filter((tag) => ids.has(tag.id));
  }

  get matchingTags(): Tag[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }

  get createName(): string | null {
    const name = this.searchQuery.trim();
    if (!name || name.length > TAG_NAME_MAX_LENGTH) {
      return null;
    }
    const lower = name.toLowerCase();
    return this.tags.some((tag) => tag.name.toLowerCase() === lower) ? null : name;
  }

  isTagged(tag: Tag): boolean {
    return this.tagIds.includes(tag.id);
  }

  trackById(_index: number, tag: Tag): number {
    return tag.id;
  }

  togglePicker() {
    this.isPickerOpen = !this.isPickerOpen;
    this.searchQuery = '';
  }

  closePicker() {
    this.isPickerOpen = false;
    this.searchQuery = '';
  }

  focusSearch(overlay: CdkConnectedOverlay) {
    overlay.overlayRef.overlayElement.querySelector<HTMLInputElement>('.ticketTags__search')?.focus();
  }

  handleOutsideClick(event: MouseEvent) {
    const target = event.target as Node | null;
    if (target && this.trigger()?.contains(target)) {
      return;
    }
    this.closePicker();
  }

  handleToggle(tag: Tag, checked: boolean) {
    if (checked) {
      this.add.emit(tag.id);
    } else {
      this.remove.emit(tag.id);
    }
  }

  handleCreate() {
    const name = this.createName;
    if (name === null) {
      return;
    }
    this.searchQuery = '';
    this.create.emit(name);
  }

  private trigger(): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector('.ticketTags__trigger');
  }
}
