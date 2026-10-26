import {Component} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {map, Observable} from 'rxjs';
import {PHRASES} from '@config/phrases';
import {ProjectFilterService} from '@services/project-filter.service';
import {DropdownOption} from '@models/dropdown.model';
import {DropdownComponent} from '@components/dropdown/dropdown.component';

@Component({
  selector: 'app-project-selector',
  imports: [
    AsyncPipe,
    NgIf,
    DropdownComponent
  ],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.css'
})
export class ProjectSelectorComponent {
  protected readonly PHRASES = PHRASES;

  readonly options$: Observable<DropdownOption[]>;

  constructor(protected projectFilterService: ProjectFilterService) {
    this.options$ = projectFilterService.projects$.pipe(
      map((projects) => [
        {value: null, labelKey: PHRASES.ALL_PROJECTS},
        ...[...projects]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((project) => ({value: project.id, label: project.name})),
      ]),
    );
  }

  get selectedProjectId(): number | null {
    return this.projectFilterService.getSelectedProjectId();
  }

  handleChange(value: string | number | null) {
    this.projectFilterService.select(value as number | null);
  }
}
