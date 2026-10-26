import {BehaviorSubject, map} from "rxjs";
import {ProjectFilterService} from "@services/project-filter.service";
import {ProjectOption} from "@models/project.model";

export interface ProjectFilterStub {
  service: ProjectFilterService;
  selected: BehaviorSubject<number | null>;
  projects: BehaviorSubject<ProjectOption[]>;
}

export function projectFilterStub(selectedProjectId: number | null = null): ProjectFilterStub {
  const selected = new BehaviorSubject<number | null>(selectedProjectId);
  const projects = new BehaviorSubject<ProjectOption[]>([]);
  const service = {
    selectedProjectId$: selected,
    projects$: projects,
    hasProjects$: projects.pipe(map((items) => items.length > 0)),
    getSelectedProjectId: () => selected.value,
    getProjects: () => projects.value,
    select: (projectId: number | null) => selected.next(projectId),
    load: () => Promise.resolve(),
  } as unknown as ProjectFilterService;
  return {service, selected, projects};
}
