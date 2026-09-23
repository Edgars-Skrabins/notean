import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {AppRoutes} from "../../app/app.routes";
import {PHRASES} from "@config/phrases";
import {AuthCardComponent} from "@components/auth-card/auth-card.component";

@Component({
  selector: 'app-create-team',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    TranslateModule,
    AuthCardComponent
  ],
  templateUrl: './create-team.component.html',
  styleUrl: './create-team.component.css'
})
export class CreateTeamComponent {
  protected readonly PHRASES = PHRASES;

  teamName = '';
  teamPassword = '';
  alertMessage = '';
  createdTeamCode: string | null = null;
  codeCopied = false;

  constructor(private navigationService: NavigationService, private teamService: TeamService) {
  }

  handleCreateTeam() {
    if (!this.doesFormHaveValidData()) {
      this.alertMessage = 'Invalid data';
      return;
    }

    this.teamService.createTeam({name: this.teamName, password: this.teamPassword})
      .then((response) => {
        if (!response.success) {
          this.alertMessage = response.statusMessage;
          return;
        }
        this.createdTeamCode = response.team.code;
      });
  }

  doesFormHaveValidData() {
    return this.teamName !== '' && this.teamPassword !== '';
  }

  handleContinueToDashboard() {
    this.navigationService.navigate(AppRoutes.DASHBOARD);
  }

  handleGoToJoinTeam() {
    this.navigationService.navigate(AppRoutes.JOIN_TEAM);
  }

  handleCopyCode() {
    if (!this.createdTeamCode) {
      return;
    }

    navigator.clipboard.writeText(this.createdTeamCode).then(() => {
      this.codeCopied = true;
      setTimeout(() => {
        this.codeCopied = false;
      }, 1500);
    });
  }
}
