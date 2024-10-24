import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {AppRoutes} from "../../app/app.routes";
import {joinWorkspace} from "../../utils/workspaceManager";
import {NavigationService} from "../../services/navigation.service";

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

  constructor(private navigationService: NavigationService) {
  }

  handleJoinWorkspace() {
    joinWorkspace(this.workspaceName, this.workspacePassword)
      .then((result) => {
        this.alertMessage = result;
      })
      .catch((error) => {
        this.alertMessage = error;
      })
  }

  handleGoToCreateWorkspace() {
    this.navigationService.navigate(AppRoutes.CREATE_WORKSPACE)
  }
}
