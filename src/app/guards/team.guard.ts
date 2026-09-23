import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../app/app.routes";

export const teamGuard: CanActivateFn = () => {
  const teamService = inject(TeamService);
  const router = inject(Router);

  if (teamService.getCurrentTeam() !== null) {
    return true;
  }

  router.navigate([AppRoutes.TEAM_SELECTION]);
  return false;
};
