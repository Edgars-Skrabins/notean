import {Component, ChangeDetectionStrategy} from '@angular/core';
import {AsyncPipe, NgIf} from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";
import {PHRASES} from "@config/phrases";
import {SettingsService} from "@services/settings.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {TeamFeatures} from "@models/team.model";
import {FavoritesGridComponent} from "@components/favorites-grid/favorites-grid.component";
import {MyWorkComponent} from "@components/my-work/my-work.component";
import {ActivityInboxComponent} from "@components/activity-inbox/activity-inbox.component";
import {getStartedActions, HomeGetStartedComponent} from "@components/home-get-started/home-get-started.component";

const GET_STARTED_DISMISSED_KEY = 'homeGetStartedDismissed';

@Component({
  selector: 'app-home',
  imports: [
    AsyncPipe,
    NgIf,
    TranslatePipe,
    ActivityInboxComponent,
    FavoritesGridComponent,
    HomeGetStartedComponent,
    MyWorkComponent
  ],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected readonly PHRASES = PHRASES;

  activityEmpty: boolean | null = null;
  isGetStartedDismissed: boolean;

  constructor(protected settingsService: SettingsService, protected teamService: TeamService, protected favoriteService: FavoriteService) {
    this.isGetStartedDismissed = this.readDismissed();
  }

  showGetStarted(features: TeamFeatures, favoriteCount: number | undefined): boolean {
    return this.activityEmpty === true
      && !favoriteCount
      && !this.isGetStartedDismissed
      && getStartedActions(features, this.teamService.getCurrentRole()).length > 0;
  }

  handleGetStartedDismissed() {
    this.isGetStartedDismissed = true;
    try {
      localStorage.setItem(this.dismissedKey(), 'true');
    } catch {
      return;
    }
  }

  private readDismissed(): boolean {
    try {
      return localStorage.getItem(this.dismissedKey()) === 'true';
    } catch {
      return false;
    }
  }

  private dismissedKey(): string {
    return `${GET_STARTED_DISMISSED_KEY}:${this.teamService.getCurrentTeamCode()}`;
  }
}
