import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from "@services/auth.service";
import {RETURN_URL_PARAM} from "@utils/returnUrl";
import {AppRoutes} from "../app/app-routes.enum";

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate([AppRoutes.LOGIN], {queryParams: {[RETURN_URL_PARAM]: state.url}});
  return false;
};
