import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {map, Observable} from 'rxjs';
import {PHRASES} from '@config/phrases';
import {ProjectFilterService} from '@services/project-filter.service';
import {DropdownOption} from '@models/dropdown.model';
import {DropdownComponent} from '@components/dropdown/dropdown.component';

@Component({
  selector: 'app-project-select',
  imports: [
    AsyncPipe,
    NgIf,
    DropdownComponent
  ],
  templateUrl: './project-select.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './project-select.component.css'
})
export class ProjectSelectComponent {
  protected readonly PHRASES = PHRASES;

  @Input() projectId: number | null = null;
  @Output() projectChange = new EventEmitter<number | null>();

  readonly options$: Observable<DropdownOption[]>;

  constructor(protected projectFilterService: ProjectFilterService) {
    this.options$ = projectFilterService.projects$.pipe(
      map((projects) => [
        {value: null, labelKey: PHRASES.NO_PROJECT},
        ...projects.map((project) => ({value: project.id, label: project.name})),
      ]),
    );
  }

  handleChange(value: string | number | null) {
    this.projectChange.emit(value as number | null);
  }
}
