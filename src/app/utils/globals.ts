import {WorkspaceData} from "../services/api.service";

type Globals = {
  currentWorkspaceData: WorkspaceData | null;
}

export let globals: Globals = {
  currentWorkspaceData: null,
}
