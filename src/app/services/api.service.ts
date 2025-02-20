import {Injectable} from '@angular/core';
import {axiosInstance} from "../config/axiosConfig";
import {
  UserResponseError,
  UserResponseSuccess,
  WorkspaceResponseError,
  WorkspaceResponseSuccess
} from "../types/api/responseTypes";

export type WorkspaceIdentifyingParams = {
  name: string,
  password: string,
}

export type UserIdentifyingParams = {
  name: string,
  email: string,
  password: string,
}

@Injectable({
  providedIn: 'root',
})

export class ApiService {
  private workspaceUrl = '/workspaces'
  private actionsUrl = '/actions'
  private userUrl = '/users'

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

  async registerUser(userIdentifyingParams: UserIdentifyingParams) {
    return axiosInstance.post(this.userUrl, {user: userIdentifyingParams})
      .then((response) => response.data.statusMessage as string)
      .catch((error) => {
        return error.response.data.statusMessage as string;
      });
  }

  async loginUser(userIdentifyingParams: UserIdentifyingParams) {
    return axiosInstance.post(this.actionsUrl + '/login', {user: userIdentifyingParams})
      .then((response) => response.data as UserResponseSuccess)
      .catch((error) => {
        return error.response.data as UserResponseError;
      });
  }

}
