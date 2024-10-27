import {Injectable} from '@angular/core';
import {ApiService, WorkspaceIdentifyingParams} from "./api.service";
import {globals} from "../utils/globals";

export type Workspace = {
  name: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class WorkspaceManagerService {
  private workspaceLocalStorageKey = 'currentWorkspace'

  constructor(private apiService: ApiService) {
    localStorage.setItem('currentWorkspace', '');
    localStorage.getItem('currentWorkspace');
    this.initializeWorkspaceManager();
  }

  leaveCurrentWorkspace() {
    localStorage.setItem(this.workspaceLocalStorageKey, '');
    globals.currentWorkspaceData = null;
  }

  getCurrentWorkspaceName() {
    return globals.currentWorkspaceData?.name;
  }

  async joinWorkspace(workspaceIdentifyingParams: WorkspaceIdentifyingParams) {
    let message: string = "";
    await this.apiService.joinWorkspace(workspaceIdentifyingParams)
      .then((response) => {
        message = response.statusMessage;
      })
      .catch((response) => {
        message = response.statusMessage as string;
      })

    return message;

    // try {
    //   const responseData = await this.apiService?.getWorkspaceByName(name);
    //   const workspace = responseData?.workspace;
    //   if (!workspace) {
    //     return Promise.reject('Workspace is undefined')
    //   }
    //   if (workspace.password === password) {
    //     localStorage.setItem(this.workspaceLocalStorageKey, name);
    //     this.updateWorkspaceData(workspace);
    //     return WorkspaceManagerReply.SuccessJoin;
    //   } else {
    //     return Promise.reject(WorkspaceManagerReply.IncorrectPassword);
    //   }
    // } catch (error) {
    //   return Promise.reject(error);
    // }
  }

  private initializeWorkspaceManager() {
    const workspaceName = localStorage.getItem(this.workspaceLocalStorageKey);
    if (!workspaceName) {
      return;
    }

    this.apiService.getWorkspaceByName(workspaceName)
      .then((response) => {
        this.updateWorkspaceData(response.workspace as Workspace);
      })
      .catch((response) => {
        console.error(response.statusMessage);
      })
  }

  private updateWorkspaceData(data: Workspace) {
    globals.currentWorkspaceData = data;
  }

  private getCurrentWorkspaceData() {
    return globals.currentWorkspaceData;
  }
}
