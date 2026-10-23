import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {DeleteProjectMode} from '@models/project.model';
import {ButtonComponent} from '@components/button/button.component';
import {EscapeService} from '@services/escape.service';

@Component({
  selector: 'app-delete-project-dialog',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonComponent
  ],
  templateUrl: './delete-project-dialog.component.html',
  styleUrl: './delete-project-dialog.component.css'
})
export class DeleteProjectDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) projectName!: string;
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<{ mode: DeleteProjectMode; confirmName: string }>();
  @Output() cancelled = new EventEmitter<void>();

  mode: DeleteProjectMode = 'keep';
  typedName = '';

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.cancelled.emit());
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  get canDelete(): boolean {
    return this.typedName === this.projectName && !this.busy;
  }

  handleDelete() {
    if (this.canDelete) {
      this.confirmed.emit({mode: this.mode, confirmName: this.typedName});
    }
  }
}
