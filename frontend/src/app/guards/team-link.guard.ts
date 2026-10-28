import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthService} from "@services/auth.service";
import {TeamService} from "@services/team.service";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../app/app-routes.enum";

export const TEAM_LINK_PARAM = 'team';

export const teamLinkGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const teamService = inject(TeamService);
  const navigationService = inject(NavigationService);
  const router = inject(Router);

  const code = route.queryParamMap.get(TEAM_LINK_PARAM);
  if (!code || !authService.isAuthenticated()) {
    return true;
  }

  const cleanUrl = router.parseUrl(state.url);
  delete cleanUrl.queryParams[TEAM_LINK_PARAM];

  if (teamService.getCurrentTeam()?.code === code) {
    return cleanUrl;
  }

  const response = await teamService.activateTeam(code);
  if (!response.success) {
    return router.createUrlTree([AppRoutes.UNAVAILABLE]);
  }

  if (router.url.startsWith(`/${AppRoutes.DASHBOARD}`)) {
    navigationService.reloadAt(router.serializeUrl(cleanUrl));
    return false;
  }

  return cleanUrl;
};
