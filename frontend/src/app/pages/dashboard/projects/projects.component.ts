import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {NgFor, NgIf} from '@angular/common';
import {debounceTime, distinctUntilChanged, map, Subject, Subscription} from 'rxjs';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ProjectFilterService} from "@services/project-filter.service";
import {ProjectService} from "@services/project.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {ProjectParams, ProjectSummary} from "@models/project.model";
import {TeamMember} from "@models/team.model";
import {AvatarComponent} from "@components/avatar/avatar.component";
import {ButtonComponent} from "@components/button/button.component";
import {LoadMoreComponent} from "@components/load-more/load-more.component";
import {NewProjectDialogComponent} from "@components/new-project-dialog/new-project-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    TranslateModule,
    AvatarComponent,
    ButtonComponent,
    LoadMoreComponent,
    NewProjectDialogComponent
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  isCreateDialogOpen = false;
  isCreating = false;
  nameError = '';
  members: TeamMember[] = [];
  projects: ProjectSummary[] | null = null;
  hasMore = false;
  isLoadingMore = false;
  searchQuery = '';
  activeSearch = '';
  readonly currentUserId: number;

  private loadGeneration = 0;
  private searchTerms = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    protected projectFilterService: ProjectFilterService,
    private projectService: ProjectService,
    private teamService: TeamService,
    private toastService: ToastService,
    authService: AuthService
  ) {
    this.currentUserId = authService.getCurrentUser()?.id ?? 0;
  }

  ngOnInit() {
    this.loadPage(true);
    this.searchSubscription = this.searchTerms
      .pipe(map((query) => query.trim()), debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        this.activeSearch = term;
        this.loadPage(true);
      });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  handleSearchChange(query: string) {
    this.searchTerms.next(query);
  }

  handleLoadMore() {
    if (!this.isLoadingMore) {
      this.loadPage(false);
    }
  }

  get canCreate(): boolean {
    const role = this.teamService.getCurrentRole();
    return role === 'owner' || role === 'admin';
  }

  handleOpenProject(project: ProjectSummary) {
    this.router.navigate([AppRoutes.DASHBOARD, AppRoutes.PROJECTS, project.id]);
  }

  handleNewProject() {
    this.nameError = '';
    this.teamService.fetchTeamMembers(this.teamService.getCurrentTeamCode()).then((members) => {
      this.members = members;
      this.isCreateDialogOpen = true;
    });
  }

  handleCancelCreate() {
    this.isCreateDialogOpen = false;
  }

  handleCreate(params: ProjectParams) {
    this.isCreating = true;
    this.projectService.createProject(this.teamService.getCurrentTeamCode(), params)
      .then((response) => {
        if (!response.success) {
          if (response.code === 'PROJECT_NAME_TAKEN') {
            this.nameError = errorPhrase(response.code);
          } else {
            this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          }
          return;
        }

        this.isCreateDialogOpen = false;
        this.projectFilterService.load();
        this.handleOpenProject(response.project);
      })
      .finally(() => {
        this.isCreating = false;
      });
  }

  private loadPage(reset: boolean) {
    const generation = reset ? ++this.loadGeneration : this.loadGeneration;
    const loaded = reset ? [] : this.projects ?? [];
    this.isLoadingMore = !reset;
    this.projectService.listProjects(this.teamService.getCurrentTeamCode(), {search: this.activeSearch, offset: loaded.length})
      .then((response) => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.isLoadingMore = false;
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          this.projects = loaded;
          return;
        }

        const loadedIds = new Set(response.projects.map((project) => project.id));
        this.projects = [...loaded.filter((project) => !loadedIds.has(project.id)), ...response.projects];
        this.hasMore = response.hasMore;
      });
  }
}
