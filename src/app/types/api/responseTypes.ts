import {Workspace} from "../../services/workspaceManager.service";
import {User} from "@services/userAuthentication.service";

export interface Response {
  statusMessage: string;
}

export interface WorkspaceResponseError extends Response {
  workspace: Workspace;
}

export interface WorkspaceResponseSuccess extends Response {
  workspace: null;
}

export interface UserResponseError extends Response {
  user: User;
}

export interface UserResponseSuccess extends Response {
  user: null;
}
