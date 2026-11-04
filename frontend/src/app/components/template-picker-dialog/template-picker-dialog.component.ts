import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {CdkTrapFocus} from '@angular/cdk/a11y';
import {TranslatePipe} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {EscapeService} from '@services/escape.service';
import {TemplateKind} from '@models/template.model';
import {ButtonComponent} from '@components/button/button.component';
import {TemplateListComponent} from '@components/template-list/template-list.component';
import {uniqueId} from '@utils/uniqueId';

@Component({
  selector: 'app-template-picker-dialog',
  imports: [
    CdkTrapFocus,
    TranslatePipe,
    ButtonComponent,
    TemplateListComponent
  ],
  templateUrl: './template-picker-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './template-picker-dialog.component.css'
})
export class TemplatePickerDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;
  protected readonly titleId = uniqueId('templatePickerDialog');

  @Input({required: true}) kind!: TemplateKind;
  @Output() picked = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.cancelled.emit());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }
}
