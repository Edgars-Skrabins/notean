import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ProjectParams} from '@models/project.model';
import {TeamMember} from '@models/team.model';
import {ButtonComponent} from '@components/button/button.component';
import {ProjectFormComponent} from '@components/project-form/project-form.component';
import {EscapeService} from '@services/escape.service';

@Component({
  selector: 'app-new-project-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonComponent,
    ProjectFormComponent
  ],
  templateUrl: './new-project-dialog.component.html',
  styleUrl: './new-project-dialog.component.css'
})
export class NewProjectDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) members: TeamMember[] = [];
  @Input({required: true}) currentUserId!: number;
  @Input() nameError = '';
  @Input() busy = false;
  @Output() confirmed = new EventEmitter<ProjectParams>();
  @Output() cancelled = new EventEmitter<void>();

  params!: ProjectParams;

  private unregisterEscape = () => {};

  constructor(private escapeService: EscapeService) {
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.cancelled.emit());
    this.params = {name: '', description: '', ownerUserId: this.currentUserId, memberIds: [this.currentUserId]};
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  get canCreate(): boolean {
    return this.params.name.trim().length > 0 && !this.busy;
  }

  handleCreate() {
    if (this.canCreate) {
      this.confirmed.emit({...this.params, name: this.params.name.trim()});
    }
  }
}
