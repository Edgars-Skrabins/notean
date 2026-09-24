import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../../../app/app-routes.enum";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    TranslateModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  protected readonly PHRASES = PHRASES;

  constructor(private navigationService: NavigationService) {
  }

  handleGoBack() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }
}
