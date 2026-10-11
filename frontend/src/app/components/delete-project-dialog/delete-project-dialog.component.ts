import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {DeleteProjectMode} from '@models/project.model';
import {ButtonComponent} from '@components/button/button.component';

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
export class DeleteProjectDialogComponent {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) projectName!: string;
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<{ mode: DeleteProjectMode; confirmName: string }>();
  @Output() cancelled = new EventEmitter<void>();

  mode: DeleteProjectMode = 'keep';
  typedName = '';

  get canDelete(): boolean {
    return this.typedName === this.projectName && !this.busy;
  }

  handleDelete() {
    if (this.canDelete) {
      this.confirmed.emit({mode: this.mode, confirmName: this.typedName});
    }
  }
}
