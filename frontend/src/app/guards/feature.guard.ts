import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {TeamFeature} from "@models/team.model";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../app/app-routes.enum";

export function featureGuard(feature: TeamFeature): CanActivateFn {
  return () => {
    const teamService = inject(TeamService);
    const toastService = inject(ToastService);
    const router = inject(Router);

    if (teamService.isFeatureEnabled(feature)) {
      return true;
    }

    toastService.show({type: ToastType.INFO, message: PHRASES.FEATURE_TURNED_OFF});
    router.navigate([AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME]);
    return false;
  };
}
