import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {AppRoutes} from '../app/app.routes';

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

  navigate(route: AppRoutes) {
    this.isNavigating = true;
    this.router.navigate([route])
      .then(() => {
        this.isNavigating = false;
      })
      .catch((error) => {
        console.error('Failed to navigate with error:', error);
        this.isNavigating = false;
      });
  }
}
