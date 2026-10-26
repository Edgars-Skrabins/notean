import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {PHRASES} from '@config/phrases';
import {ProjectService} from '@services/project.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {DeleteProjectMode, ProjectDetail, ProjectParams} from '@models/project.model';
import {TeamMember} from '@models/team.model';
import {ProjectFormComponent} from '@components/project-form/project-form.component';
import {ButtonComponent} from '@components/button/button.component';
import {IconButtonComponent} from '@components/icon-button/icon-button.component';
import {ConfirmDialogComponent} from '@components/confirm-dialog/confirm-dialog.component';
import {DeleteProjectDialogComponent} from '@components/delete-project-dialog/delete-project-dialog.component';
import {errorPhrase} from '@utils/errorPhrase';
import {EscapeService} from '@services/escape.service';

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
  selector: 'app-project-settings-dialog',
  imports: [
    NgIf,
    TranslateModule,
    ProjectFormComponent,
    ButtonComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    DeleteProjectDialogComponent
  ],
  templateUrl: './project-settings-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './project-settings-dialog.component.css'
})
export class ProjectSettingsDialogComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input({required: true}) project!: ProjectDetail;
  @Input({required: true}) members: TeamMember[] = [];
  @Output() saved = new EventEmitter<ProjectDetail>();
  @Output() deleted = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  savedParams!: ProjectParams;
  params!: ProjectParams;
  nameError = '';
  isSaving = false;
  isDeleteDialogOpen = false;
  isLeaveConfirmOpen = false;

  private resolveLeave: ((canLeave: boolean) => void) | null = null;
  private unregisterEscape = () => {};

  constructor(
    private projectService: ProjectService,
    private projectFilterService: ProjectFilterService,
    private teamService: TeamService,
    private toastService: ToastService,
    private escapeService: EscapeService
  ) {
  }

  private get teamCode(): string {
    return this.teamService.getCurrentTeamCode();
  }

  get hasUnsavedChanges(): boolean {
    return !sameParams(this.params, this.savedParams);
  }

  ngOnInit() {
    this.unregisterEscape = this.escapeService.push(() => this.handleClose());
    this.applyProject(this.project);
  }

  ngOnDestroy() {
    this.unregisterEscape();
  }

  handleParamsChange(params: ProjectParams) {
    this.params = params;
    this.nameError = '';
  }

  handleSave() {
    if (!this.hasUnsavedChanges || this.isSaving) {
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
        this.saved.emit(response.project);
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
        this.deleted.emit();
      });
  }

  handleClose() {
    Promise.resolve(this.confirmLeave()).then((canLeave) => {
      if (canLeave) {
        this.closed.emit();
      }
    });
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
    this.savedParams = toParams(project);
    this.params = toParams(project);
  }

  private closeLeaveConfirm(canLeave: boolean) {
    this.isLeaveConfirmOpen = false;
    this.resolveLeave?.(canLeave);
    this.resolveLeave = null;
  }
}
