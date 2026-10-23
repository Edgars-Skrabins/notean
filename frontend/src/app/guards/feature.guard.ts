import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {TeamService} from "@services/team.service";
import {TeamFeature} from "@models/team.model";
import {AppRoutes} from "../app/app-routes.enum";

export function featureGuard(feature: TeamFeature): CanActivateFn {
  return () => {
    const teamService = inject(TeamService);
    const router = inject(Router);

    if (teamService.isFeatureEnabled(feature)) {
      return true;
    }

    router.navigate([AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME]);
    return false;
  };
}
