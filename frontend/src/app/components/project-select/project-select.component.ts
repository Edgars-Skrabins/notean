import {Component, EventEmitter, Input, Output} from '@angular/core';
import {AsyncPipe, NgFor} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ProjectFilterService} from '@services/project-filter.service';

const NO_PROJECT = '';

@Component({
  selector: 'app-project-select',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    TranslateModule
  ],
  templateUrl: './project-select.component.html',
  styleUrl: './project-select.component.css'
})
export class ProjectSelectComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly NO_PROJECT = NO_PROJECT;

  @Input() projectId: number | null = null;
  @Output() projectChange = new EventEmitter<number | null>();

  constructor(protected projectFilterService: ProjectFilterService) {
  }

  get value(): string {
    return String(this.projectId ?? NO_PROJECT);
  }

  handleChange(select: HTMLSelectElement) {
    const projectId = select.value === NO_PROJECT ? null : Number(select.value);
    select.value = this.value;
    if (projectId !== this.projectId) {
      this.projectChange.emit(projectId);
    }
  }
}
