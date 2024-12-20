import {Component} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "@services/navigation.service";
import {TranslateModule} from "@ngx-translate/core";
import {ApiService, WorkspaceIdentifyingParams} from "@services/api.service";

@Component({
  selector: 'app-create-workspace',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './create-workspace.component.html',
  styleUrl: './create-workspace.component.css'
})
export class CreateWorkspaceComponent {
  workspaceName = '';
  workspacePassword = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private apiService: ApiService) {
  }

  handleCreateWorkspace() {
    const workspaceData: WorkspaceIdentifyingParams = {
      name: this.workspaceName,
      password: this.workspacePassword,
    }

    if (!this.doesFormHaveValidData()) {
      this.alertMessage = 'Invalid data';
      return;
    }

    this.apiService.createWorkspace(workspaceData)
      .then((successMessage) => {
        this.alertMessage = successMessage;
      })
      .catch((errorMessage) => {
        this.alertMessage = errorMessage
      })
  }

  doesFormHaveValidData() {
    return this.workspaceName !== '' && this.workspacePassword !== '';
  }

  handleGoToJoinWorkspace() {
    this.navigationService?.navigate(AppRoutes.JOIN_WORKSPACE);
  }
}
