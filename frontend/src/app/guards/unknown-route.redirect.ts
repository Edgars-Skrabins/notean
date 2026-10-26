import {inject} from '@angular/core';
import {RedirectFunction, Router} from '@angular/router';
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../app/app-routes.enum";

export const unknownRouteRedirect: RedirectFunction = () => {
  const authService = inject(AuthService);
  const teamService = inject(TeamService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree([AppRoutes.LOGIN]);
  }

  if (teamService.getCurrentTeam() === null) {
    return router.createUrlTree([AppRoutes.TEAM_SELECTION]);
  }

  return router.createUrlTree([AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME]);
};
