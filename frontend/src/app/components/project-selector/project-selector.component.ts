import {Component} from '@angular/core';
import {AsyncPipe, NgFor} from '@angular/common';
import {map, Observable} from 'rxjs';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ProjectFilterService} from '@services/project-filter.service';
import {ProjectSummary} from '@models/project.model';

const ALL_OPTION = '';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    TranslateModule
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.css'
})
export class ProjectSelectorComponent {
  protected readonly PHRASES = PHRASES;
  protected readonly ALL_OPTION = ALL_OPTION;

  readonly projects$: Observable<ProjectSummary[]>;

  constructor(protected projectFilterService: ProjectFilterService) {
    this.projects$ = projectFilterService.projects$.pipe(
      map((projects) => [...projects].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }

  get selectedValue(): string {
    return String(this.projectFilterService.getSelectedProjectId() ?? ALL_OPTION);
  }

  handleChange(value: string) {
    this.projectFilterService.select(value === ALL_OPTION ? null : Number(value));
  }
}
