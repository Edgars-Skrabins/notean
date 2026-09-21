import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {TranslateModule} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app.routes";
import {PHRASES} from "@config/phrases";

@Component({
  selector: 'app-join-team',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule
  ],
  templateUrl: './join-team.component.html',
  styleUrl: './join-team.component.css'
})
export class JoinTeamComponent {
  protected readonly PHRASES = PHRASES;

  teamCode = '';
  teamPassword = '';
  alertMessage = '';

  constructor(private navigationService: NavigationService, private teamService: TeamService) {
  }

  handleJoinTeam() {
    if (!this.doesFormHaveValidData()) {
      this.alertMessage = 'Invalid data';
      return;
    }

    this.teamService.joinTeam({code: this.teamCode, password: this.teamPassword})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }
        this.navigationService.navigate(AppRoutes.DASHBOARD);
      });
  }

  doesFormHaveValidData() {
    return this.teamCode.length === 32 && this.teamPassword !== '';
  }

  handleGoToCreateTeam() {
    this.navigationService.navigate(AppRoutes.CREATE_TEAM);
  }
}
