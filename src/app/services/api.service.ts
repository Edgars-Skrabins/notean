import {Injectable} from '@angular/core';
import {axiosInstance} from "../config/axiosConfig";
import {WorkspaceResponseError, WorkspaceResponseSuccess} from "../types/api/responseTypes";

export type WorkspaceIdentifyingParams = {
  name: string,
  password: string,
}

@Injectable({
  providedIn: 'root',
})

export class ApiService {
  private workspaceUrl = '/workspaces'
  private actionsUrl = '/actions'

  async getWorkspaceByName(name: string) {
    const url = `${this.workspaceUrl}/${name}`;
    return axiosInstance.get(url)
      .then((response) => response.data as WorkspaceResponseSuccess)
      .catch((error) => {
        return error.response.data as WorkspaceResponseError;
      });
  }

  async createWorkspace(workspaceIdentifyingParams: WorkspaceIdentifyingParams): Promise<string> {
    return axiosInstance.post(this.workspaceUrl, {workspace: workspaceIdentifyingParams})
      .then((response) => response.data.statusMessage as string)
      .catch((error) => {
        return error.response.data.statusMessage as string;
      });
  }

  async joinWorkspace(workspaceIdentifyingParams: WorkspaceIdentifyingParams) {
    return axiosInstance.post(this.actionsUrl + '/joinworkspace', {workspace: workspaceIdentifyingParams})
      .then((response) => response.data as WorkspaceResponseSuccess)
      .catch((error) => {
        return error.response.data as WorkspaceResponseError;
      });
  }
}
