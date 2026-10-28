import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {AppRoutes} from '../app/app-routes.enum';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private isNavigating: boolean = false;

  constructor(private router: Router) {

  }

  public getIsNavigating(): boolean {
    return this.isNavigating;
  }

  navigate(...routeSegments: AppRoutes[]) {
    this.track(this.router.navigate(routeSegments));
  }

  navigateWithState(state: Record<string, unknown>, ...routeSegments: AppRoutes[]) {
    this.track(this.router.navigate(routeSegments, {state}));
  }

  navigateWithQuery(queryParams: Record<string, string>, ...routeSegments: AppRoutes[]) {
    this.track(this.router.navigate(routeSegments, {queryParams}));
  }

  navigateReplacingUrl(...routeSegments: AppRoutes[]) {
    this.track(this.router.navigate(routeSegments, {replaceUrl: true}));
  }

  navigateByUrl(url: string) {
    this.track(this.router.navigateByUrl(url));
  }

  reloadAt(url: string) {
    window.location.assign(url);
  }

  private track(navigation: Promise<boolean>) {
    this.isNavigating = true;
    navigation
      .then(() => {
        this.isNavigating = false;
      })
      .catch((error) => {
        console.error('Failed to navigate with error:', error);
        this.isNavigating = false;
      });
  }
}
