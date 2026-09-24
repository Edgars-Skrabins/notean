import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {DatePipe, NgFor, NgIf} from '@angular/common';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {DiagramService} from "@services/diagram.service";
import {DiagramEditingService} from "@services/diagram-editing.service";
import {TeamService} from "@services/team.service";
import {AuthService} from "@services/auth.service";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../../../app/app-routes.enum";
import {DiagramDetail, DiagramUser} from "@models/diagram.model";
import {FlowchartEditorComponent} from "@components/flowchart-editor/flowchart-editor.component";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";
import {ButtonComponent} from "@components/button/button.component";
import {ConfirmDeleteDialogComponent} from "@components/confirm-delete-dialog/confirm-delete-dialog.component";

@Component({
  selector: 'app-diagram-detail',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    DatePipe,
    TranslateModule,
    FlowchartEditorComponent,
    IconButtonComponent,
    ButtonComponent,
    ConfirmDeleteDialogComponent
  ],
  templateUrl: './diagram-detail.component.html',
  styleUrl: './diagram-detail.component.css'
})
export class DiagramDetailComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  diagram: DiagramDetail | null = null;
  mode: 'view' | 'edit' = 'view';
  draftTitle = '';
  draftContent = '';
  editingUser: DiagramUser | null = null;
  isLoading = true;
  alertMessage = '';
  showDeleteConfirm = false;

  private teamCode: string;
  private diagramId = 0;

  constructor(
    private route: ActivatedRoute,
    private diagramService: DiagramService,
    private diagramEditingService: DiagramEditingService,
    private teamService: TeamService,
    private authService: AuthService,
    private navigationService: NavigationService
  ) {
    this.teamCode = this.teamService.getCurrentTeam()!.code;
  }

  get showEditingBanner(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return this.editingUser !== null && this.editingUser.id !== currentUser?.id;
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.diagramId = Number(params.get('id'));
      this.loadDiagram();
      this.diagramEditingService.connect(this.diagramId, (editor) => {
        this.editingUser = editor;
      });
    });
  }

  ngOnDestroy() {
    if (this.mode === 'edit') {
      this.diagramEditingService.stopEditing();
    }
    this.diagramEditingService.disconnect();
  }

  handleEdit() {
    if (!this.diagram) {
      return;
    }

    this.draftTitle = this.diagram.title;
    this.draftContent = this.diagram.content;
    this.mode = 'edit';
    this.diagramEditingService.startEditing();
  }

  handleCancel() {
    this.mode = 'view';
    this.diagramEditingService.stopEditing();
  }

  handleDelete() {
    if (!this.diagram) {
      return;
    }
    this.showDeleteConfirm = true;
  }

  handleCancelDelete() {
    this.showDeleteConfirm = false;
  }

  handleConfirmDelete() {
    this.showDeleteConfirm = false;

    if (!this.diagram) {
      return;
    }

    this.diagramService.deleteDiagram(this.teamCode, this.diagram.id)
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.handleGoBack();
      });
  }

  handleSave() {
    if (!this.diagram) {
      return;
    }

    this.diagramService.saveDiagram(this.teamCode, this.diagram.id, {title: this.draftTitle, content: this.draftContent})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.diagram = response.diagram;
        this.mode = 'view';
        this.diagramEditingService.stopEditing();
      });
  }

  handleContentChange(content: string) {
    this.draftContent = content;
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DIAGRAMS);
  }

  private loadDiagram() {
    this.isLoading = true;

    this.diagramService.getDiagram(this.teamCode, this.diagramId)
      .then((response) => {
        this.isLoading = false;

        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }

        this.alertMessage = '';
        this.diagram = response.diagram;
        this.editingUser = response.diagram.currentlyEditing;

        const shouldStartInEditMode = this.route.snapshot.queryParamMap.get('edit') === 'true';
        if (shouldStartInEditMode) {
          this.handleEdit();
        }
      });
  }
}
