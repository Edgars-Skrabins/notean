import {global} from "./global";
import {WorkspaceData} from "../services/api.service";

export enum WorkspaceManagerReply {
  SuccessJoin = 'Successfully joined workspace',
  IncorrectPassword = 'Workspace password is incorrect',
}

localStorage.setItem('currentWorkspace', '');
localStorage.getItem('currentWorkspace');

const workspaceLocalStorageKey = 'currentWorkspace'

export function initializeWorkspaceManager() {
  const workspaceName = localStorage.getItem(workspaceLocalStorageKey);
  if (!workspaceName) {
    return;
  }

  global.apiService?.getWorkspaceByName(workspaceName)
    .then((response) => {
      updateWorkspaceData(response.workspace);
    })
}

function updateWorkspaceData(data: WorkspaceData) {
  global.currentWorkspaceData = data;
}

export async function joinWorkspace(name: string, password: string) {
  try {
    const responseData = await global.apiService?.getWorkspaceByName(name);
    const workspace = responseData?.workspace;
    if (!workspace) {
      return Promise.reject('Workspace is undefined')
    }
    if (workspace.password === password) {
      localStorage.setItem(workspaceLocalStorageKey, name);
      updateWorkspaceData(workspace);
      return WorkspaceManagerReply.SuccessJoin;
    } else {
      return Promise.reject(WorkspaceManagerReply.IncorrectPassword);
    }
  } catch (error) {
    return Promise.reject(error);
  }
}

export function leaveCurrentWorkspace() {
  localStorage.setItem(workspaceLocalStorageKey, '');
  global.currentWorkspaceData = null;
}

export function getCurrentWorkspaceName() {
  return global.currentWorkspaceData?.name;
}

export function getCurrentWorkspaceData() {
  return global.currentWorkspaceData;
}
