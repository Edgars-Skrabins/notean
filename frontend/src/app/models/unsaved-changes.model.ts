export interface HasUnsavedChanges {
  confirmLeave(): boolean | Promise<boolean>;
}
