import {Injectable} from '@angular/core';
import {ApiService} from "./api.service";
import {global} from "./global";
import {WorkspaceData} from "../services/api.service";
import {initializeWorkspaceManager} from "../utils/workspaceManager";

export enum WorkspaceManagerReply {
  SuccessJoin = 'Successfully joined workspace',
  IncorrectPassword = 'Workspace password is incorrect',
}

@Injectable({
  providedIn: 'root',
})
export class WorkspaceManagerService {
  private workspaceLocalStorageKey = 'currentWorkspace'

  constructor(private apiService: ApiService) {
    localStorage.setItem('currentWorkspace', '');
    localStorage.getItem('currentWorkspace');
    initializeWorkspaceManager();
  }

  public leaveCurrentWorkspace() {
    localStorage.setItem(this.workspaceLocalStorageKey, '');
    global.currentWorkspaceData = null;
  }

  public getCurrentWorkspaceName() {
    return global.currentWorkspaceData?.name;
  }

  public async joinWorkspace(name: string, password: string) {
    try {
      const responseData = await global.apiService?.getWorkspaceByName(name);
      const workspace = responseData?.workspace;
      if (!workspace) {
        return Promise.reject('Workspace is undefined')
      }
      if (workspace.password === password) {
        localStorage.setItem(this.workspaceLocalStorageKey, name);
        this.updateWorkspaceData(workspace);
        return WorkspaceManagerReply.SuccessJoin;
      } else {
        return Promise.reject(WorkspaceManagerReply.IncorrectPassword);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private initializeWorkspaceManager() {
    const workspaceName = localStorage.getItem(this.workspaceLocalStorageKey);
    if (!workspaceName) {
      return;
    }

    this.apiService.getWorkspaceByName(workspaceName)
      .then((response) => {
        this.updateWorkspaceData(response.workspace);
      })
  }

  private updateWorkspaceData(data: WorkspaceData) {
    global.currentWorkspaceData = data;
  }

  private getCurrentWorkspaceData() {
    return global.currentWorkspaceData;
  }
}
