import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {NavigationService} from "../../services/navigation.service";
import {WorkspaceManagerService} from "../../services/workspaceManager.service";
import {TranslationService} from "../../services/translations/dictionaries/translations.service";
import {WorkspaceIdentifyingParams} from "../../services/api.service";

@Component({
  selector: 'app-join-workspace',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './join-workspace.component.html',
  styleUrl: './join-workspace.component.css'
})
export class JoinWorkspaceComponent {
  workspaceName = '';
  workspacePassword = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private workspaceManagerService: WorkspaceManagerService, protected translationService: TranslationService) {
  }

  handleJoinWorkspace() {
    const workspaceIdentifyingParams: WorkspaceIdentifyingParams = {
      name: this.workspaceName,
      password: this.workspacePassword,
    }
    this.workspaceManagerService.joinWorkspace(workspaceIdentifyingParams)
      .then((message) => {
        this.alertMessage = message;
      })
  }

  handleGoToCreateWorkspace() {
    this.navigationService.navigate(AppRoutes.CREATE_WORKSPACE)
  }
}
