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
