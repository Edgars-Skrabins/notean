import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {Subscription} from 'rxjs';
import {DashboardHeaderComponent} from "@components/dashboard-header/dashboard-header.component";
import {DashboardSidebarComponent} from "@components/dashboard-sidebar/dashboard-sidebar.component";
import {FavoriteService} from "@services/favorite.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {TeamFeatures} from "@models/team.model";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {routeFeature} from "@utils/routeFeature";
import {AppRoutes} from "../../app/app-routes.enum";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterOutlet,
    DashboardHeaderComponent,
    DashboardSidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private featuresSubscription: Subscription | null = null;

  constructor(
    private favoriteService: FavoriteService,
    private projectFilterService: ProjectFilterService,
    private teamService: TeamService,
    private teamChannelService: TeamChannelService,
    private navigationService: NavigationService,
    private toastService: ToastService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.favoriteService.load();
    this.projectFilterService.load();

    const team = this.teamService.getCurrentTeam();
    if (team) {
      this.teamChannelService.connect(team.code);
    }

    this.featuresSubscription = this.teamService.features$.subscribe((features) => this.leaveDisabledFeature(features));
  }

  ngOnDestroy() {
    this.featuresSubscription?.unsubscribe();
    this.teamChannelService.disconnect();
  }

  private leaveDisabledFeature(features: TeamFeatures) {
    const feature = routeFeature(this.router.url);
    if (!feature || features[feature]) {
      return;
    }

    this.navigationService.navigate(AppRoutes.DASHBOARD, AppRoutes.DASHBOARD_HOME);
    this.toastService.show({type: ToastType.INFO, message: PHRASES.FEATURE_TURNED_OFF});
  }
}
