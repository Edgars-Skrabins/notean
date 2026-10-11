import {BehaviorSubject} from "rxjs";
import {ProjectFilterService} from "@services/project-filter.service";
import {ProjectSummary} from "@models/project.model";

export interface ProjectFilterStub {
  service: ProjectFilterService;
  selected: BehaviorSubject<number | null>;
  projects: BehaviorSubject<ProjectSummary[]>;
}

export function projectFilterStub(selectedProjectId: number | null = null): ProjectFilterStub {
  const selected = new BehaviorSubject<number | null>(selectedProjectId);
  const projects = new BehaviorSubject<ProjectSummary[]>([]);
  const service = {
    selectedProjectId$: selected,
    projects$: projects,
    getSelectedProjectId: () => selected.value,
    getProjects: () => projects.value,
    select: (projectId: number | null) => selected.next(projectId),
    load: () => Promise.resolve(),
  } as unknown as ProjectFilterService;
  return {service, selected, projects};
}
