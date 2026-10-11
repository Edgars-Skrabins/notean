import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {ProjectService} from "@services/project.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {NavigationService} from "@services/navigation.service";
import {ToastType} from "@models/toast.model";
import {DeleteProjectMode, ProjectDetail, ProjectParams} from "@models/project.model";
import {TeamMember} from "@models/team.model";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";
import {ProjectFormComponent} from "@components/project-form/project-form.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDialogComponent} from "@components/confirm-dialog/confirm-dialog.component";
import {DeleteProjectDialogComponent} from "@components/delete-project-dialog/delete-project-dialog.component";
import {errorPhrase} from "@utils/errorPhrase";
import {AppRoutes} from "../../../app/app-routes.enum";

function toParams(project: ProjectDetail): ProjectParams {
  return {
    name: project.name,
    description: project.description,
    ownerUserId: project.owner.id,
    memberIds: project.members.map((member) => member.id),
  };
}

function sameParams(a: ProjectParams, b: ProjectParams): boolean {
  const sortedA = [...a.memberIds].sort();
  const sortedB = [...b.memberIds].sort();
  return a.name === b.name
    && a.description === b.description
    && a.ownerUserId === b.ownerUserId
    && sortedA.length === sortedB.length
    && sortedA.every((id, index) => id === sortedB[index]);
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    NgIf,
    TranslateModule,
    ProjectFormComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    DeleteProjectDialogComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit, HasUnsavedChanges {
  protected readonly PHRASES = PHRASES;

  project: ProjectDetail | null = null;
  savedParams: ProjectParams | null = null;
  params: ProjectParams | null = null;
  members: TeamMember[] = [];
  alertMessage = '';
  nameError = '';
  isSaving = false;
  isDeleteDialogOpen = false;
  isLeaveConfirmOpen = false;

  private resolveLeave: ((canLeave: boolean) => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private projectFilterService: ProjectFilterService,
    private teamService: TeamService,
    private toastService: ToastService,
    private navigationService: NavigationService
  ) {
  }

  private get teamCode(): string {
    return this.teamService.getCurrentTeamCode();
  }

  get hasUnsavedChanges(): boolean {
    return !!this.params && !!this.savedParams && !sameParams(this.params, this.savedParams);
  }

  ngOnInit() {
    const projectId = Number(this.route.snapshot.paramMap.get('id'));
    this.teamService.fetchTeamMembers(this.teamCode).then((members) => {
      this.members = members;
    });
    this.projectService.getProject(this.teamCode, projectId).then((response) => {
      if (!response.success) {
        this.alertMessage = errorPhrase(response.code);
        return;
      }
      this.applyProject(response.project);
    });
  }

  handleParamsChange(params: ProjectParams) {
    this.params = params;
    this.nameError = '';
  }

  handleSave() {
    if (!this.project || !this.params || !this.hasUnsavedChanges || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.projectService.updateProject(this.teamCode, this.project.id, {...this.params, name: this.params.name.trim()})
      .then((response) => {
        if (!response.success) {
          if (response.code === 'PROJECT_NAME_TAKEN') {
            this.nameError = errorPhrase(response.code);
          } else {
            this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          }
          return;
        }

        this.applyProject(response.project);
        this.projectFilterService.load();
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROJECT_SAVED});
      })
      .finally(() => {
        this.isSaving = false;
      });
  }

  handleOpenDelete() {
    this.isDeleteDialogOpen = true;
  }

  handleCancelDelete() {
    this.isDeleteDialogOpen = false;
  }

  handleConfirmDelete(event: { mode: DeleteProjectMode; confirmName: string }) {
    if (!this.project) {
      return;
    }

    const projectId = this.project.id;
    this.projectService.deleteProject(this.teamCode, projectId, event.mode, event.confirmName)
      .then((response) => {
        if (!response.success) {
          this.toastService.show({type: ToastType.ERROR, message: errorPhrase(response.code)});
          return;
        }

        this.isDeleteDialogOpen = false;
        this.savedParams = this.params;
        if (this.projectFilterService.getSelectedProjectId() === projectId) {
          this.projectFilterService.select(null);
        }
        this.projectFilterService.load();
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.PROJECT_DELETED});
        this.handleGoBack();
      });
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.PROJECTS);
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    this.resolveLeave?.(false);
    this.isLeaveConfirmOpen = true;

    return new Promise((resolve) => {
      this.resolveLeave = resolve;
    });
  }

  handleConfirmLeave() {
    this.closeLeaveConfirm(true);
  }

  handleCancelLeave() {
    this.closeLeaveConfirm(false);
  }

  private applyProject(project: ProjectDetail) {
    this.project = project;
    this.savedParams = toParams(project);
    this.params = toParams(project);
  }

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
