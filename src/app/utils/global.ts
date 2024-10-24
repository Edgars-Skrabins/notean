import {WorkspaceData} from "../services/api.service";

type Globals = {
  currentWorkspaceData: WorkspaceData | null;
}

export let global: Globals = {
  currentWorkspaceData: null,
}
