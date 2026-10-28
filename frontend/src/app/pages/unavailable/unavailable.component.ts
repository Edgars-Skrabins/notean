import {Component, ChangeDetectionStrategy} from '@angular/core';
import {TranslatePipe} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app-routes.enum";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-unavailable',
  imports: [
    TranslatePipe,
    AuthCardComponent
  ],
  templateUrl: './unavailable.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './unavailable.component.css'
})
export class UnavailableComponent {
  protected readonly PHRASES = PHRASES;

  constructor(
    private navigationService: NavigationService,
    private teamService: TeamService
  ) {
  }

  handleGoHome() {
    if (this.teamService.getCurrentTeam() !== null) {
      this.navigationService.navigate(AppRoutes.DASHBOARD);
    } else {
      this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
    }
  }
}
