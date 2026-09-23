import {Component} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {AppRoutes} from "../../app/app.routes";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-team-selection',
  standalone: true,
  imports: [
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './team-selection.component.html',
  styleUrl: './team-selection.component.css'
})
export class TeamSelectionComponent {
  protected readonly PHRASES = PHRASES;

  constructor(private navigationService: NavigationService) {
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }

  handleGoToJoinTeam() {
    this.navigationService.navigate(AppRoutes.JOIN_TEAM);
  }
}
