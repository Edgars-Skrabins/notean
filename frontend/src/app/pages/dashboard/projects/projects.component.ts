import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {AsyncPipe, NgFor, NgIf} from '@angular/common';
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
import {NewProjectDialogComponent} from "@components/new-project-dialog/new-project-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    AsyncPipe,
    NgFor,
    NgIf,
    TranslateModule,
    AvatarComponent,
    ButtonComponent,
    NewProjectDialogComponent
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent {
  protected readonly PHRASES = PHRASES;

  isCreateDialogOpen = false;
  isCreating = false;
  nameError = '';
  members: TeamMember[] = [];
  readonly currentUserId: number;

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
}
