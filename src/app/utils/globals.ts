import {Workspace} from "../services/workspaceManager.service";

type Globals = {
  currentWorkspaceData: Workspace | null;
}

export let globals: Globals = {
  currentWorkspaceData: null,
}
