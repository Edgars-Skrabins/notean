import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ButtonComponent} from '@components/button/button.component';

@Component({
  selector: 'app-create-named-item-dialog',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './create-named-item-dialog.component.html',
  styleUrl: './create-named-item-dialog.component.css'
})
export class CreateNamedItemDialogComponent implements OnInit {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) dialogTitle!: string;
  @Input({required: true}) defaultValue!: string;
  @Output() confirmed = new EventEmitter<{ title: string }>();
  @Output() cancelled = new EventEmitter<void>();

  itemTitle = '';

  ngOnInit() {
    this.itemTitle = this.defaultValue;
  }

  handleConfirm() {
    const title = this.itemTitle.trim() || this.defaultValue;
    this.confirmed.emit({title});
  }

  handleCancel() {
    this.cancelled.emit();
  }
}
