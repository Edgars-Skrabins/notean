import {Injectable} from '@angular/core';
import {axiosInstance} from "../api/axiosConfig";

export type WorkspaceData = {
  name: string;
  password: string;
}

export interface ResponseData {
  statusMessage: string,
}

export interface WorkspaceResponseData extends ResponseData {
  workspace: WorkspaceData
}

@Injectable({
  providedIn: 'root',
})

export class ApiService {
  private workspaceUrl = '/workspaces'
  private actionsUrl = '/actions'

  async getWorkspaceByName(name: string): Promise<WorkspaceResponseData> {
    const url = `${this.workspaceUrl}/${name}`;
    return axiosInstance.get(url)
      .then((response) => response.data)
      .catch((error) => {
        return error.response.data;
      });
  }

  async createWorkspace(workspaceData: WorkspaceData): Promise<string> {
    return axiosInstance.post(this.workspaceUrl, {workspace: workspaceData})
      .then((response) => response.data.statusMessage)
      .catch((error) => {
        return error.response.data.statusMessage;
      });
  }

  async joinWorkspace(workspaceData: WorkspaceData): Promise<string> {
    return axiosInstance.post(this.actionsUrl + '/joinworkspace', {workspace: workspaceData})
      .then((response) => response.data.statusMessage)
      .catch((error) => {
        return error.response.data.statusMessage;
      });
  }
}
