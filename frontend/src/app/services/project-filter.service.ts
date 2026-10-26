import {Injectable} from '@angular/core';
import {BehaviorSubject, map, Observable} from 'rxjs';
import {ProjectService} from "@services/project.service";
import {TeamService} from "@services/team.service";
import {ProjectOption} from "@models/project.model";

const STORAGE_KEY_PREFIX = 'selectedProject:';
const ALL_PROJECTS = 'all';

@Injectable({
  providedIn: 'root',
})
export class ProjectFilterService {
  private projectsSubject = new BehaviorSubject<ProjectOption[]>([]);
  private selectedSubject: BehaviorSubject<number | null>;

  readonly projects$: Observable<ProjectOption[]> = this.projectsSubject.asObservable();
  readonly hasProjects$: Observable<boolean> = this.projects$.pipe(map((projects) => projects.length > 0));
  readonly selectedProjectId$: Observable<number | null>;

  constructor(
    private projectService: ProjectService,
    private teamService: TeamService
  ) {
    this.selectedSubject = new BehaviorSubject<number | null>(this.readStoredSelection());
    this.selectedProjectId$ = this.selectedSubject.asObservable();
  }

  getSelectedProjectId(): number | null {
    return this.selectedSubject.value;
  }

  getProjects(): ProjectOption[] {
    return this.projectsSubject.value;
  }

  async load() {
    const response = await this.projectService.listProjectOptions(this.teamService.getCurrentTeamCode());
    if (!response.success) {
      return;
    }

    this.projectsSubject.next(response.projects);
    const stored = this.readStoredSelection();
    const selected = stored !== null && response.projects.some((project) => project.id === stored) ? stored : null;
    this.select(selected);
  }

  select(projectId: number | null) {
    localStorage.setItem(this.storageKey(), projectId === null ? ALL_PROJECTS : String(projectId));
    if (projectId !== this.selectedSubject.value) {
      this.selectedSubject.next(projectId);
    }
  }

  private readStoredSelection(): number | null {
    const stored = localStorage.getItem(this.storageKey());
    const projectId = Number(stored);
    return stored && stored !== ALL_PROJECTS && Number.isInteger(projectId) ? projectId : null;
  }

  private storageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.teamService.getCurrentTeam()?.code ?? ''}`;
  }
}
