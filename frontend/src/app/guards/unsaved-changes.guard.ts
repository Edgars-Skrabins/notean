import {inject} from '@angular/core';
import {CanDeactivateFn} from '@angular/router';
import {AuthService} from "@services/auth.service";
import {HasUnsavedChanges} from "@models/unsaved-changes.model";

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return component.confirmLeave();
};
