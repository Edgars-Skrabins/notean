import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../app/app-routes.enum";

export const teamRoleGuard: CanActivateFn = () => {
  const teamService = inject(TeamService);
  const router = inject(Router);

  const role = teamService.getCurrentRole();
  if (role === 'admin' || role === 'owner') {
    return true;
  }

  router.navigate([AppRoutes.DASHBOARD]);
  return false;
};
