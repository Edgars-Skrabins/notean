import {Workspace} from "../../services/workspaceManager.service";

export interface Response {
  statusMessage: string;
}

export interface WorkspaceResponseError extends Response {
  workspace: Workspace;
}

export interface WorkspaceResponseSuccess extends Response {
  workspace: null;
}
