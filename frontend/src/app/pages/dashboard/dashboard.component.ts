import {Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgIf} from '@angular/common';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {BreakpointObserver} from '@angular/cdk/layout';
import {A11yModule, CdkTrapFocus} from '@angular/cdk/a11y';
import {filter, Subscription} from 'rxjs';
import {TranslatePipe} from '@ngx-translate/core';
import {DashboardHeaderComponent} from "@components/dashboard-header/dashboard-header.component";
import {DashboardSidebarComponent} from "@components/dashboard-sidebar/dashboard-sidebar.component";
import {FavoriteService} from "@services/favorite.service";
import {ProjectFilterService} from "@services/project-filter.service";
import {TeamService} from "@services/team.service";
import {TeamChannelService} from "@services/team-channel.service";
import {NotificationChannelService} from "@services/notification-channel.service";
import {ChatCableService} from "@services/chat-cable.service";
import {NavigationService} from "@services/navigation.service";
import {ToastService} from "@services/toast.service";
import {EscapeService} from "@services/escape.service";
import {TeamFeatures} from "@models/team.model";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {routeFeature} from "@utils/routeFeature";
import {AppRoutes} from "../../app/app-routes.enum";

const COMPACT_QUERY = '(max-width: 767px)';

@Component({
  selector: 'app-dashboard',
  imports: [
    NgIf,
    RouterOutlet,
    A11yModule,
    TranslatePipe,
    DashboardHeaderComponent,
    DashboardSidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @ViewChild(CdkTrapFocus) navTrap?: CdkTrapFocus;

  isCompact = false;
  isNavOpen = false;

  private featuresSubscription: Subscription | null = null;
  private breakpointSubscription: Subscription | null = null;
  private navigationSubscription: Subscription | null = null;
  private unregisterEscape: (() => void) | null = null;
  private navReturnFocus: HTMLElement | null = null;

  constructor(
    private favoriteService: FavoriteService,
    private projectFilterService: ProjectFilterService,
    private teamService: TeamService,
    private teamChannelService: TeamChannelService,
    private notificationChannelService: NotificationChannelService,
    private chatCableService: ChatCableService,
    private navigationService: NavigationService,
    private toastService: ToastService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private escapeService: EscapeService
  ) {
  }

  ngOnInit() {
    this.favoriteService.load();
    this.projectFilterService.load();

    const team = this.teamService.getCurrentTeam();
    if (team) {
      this.teamChannelService.connect(team.code);
      this.notificationChannelService.connect(team.code);
    }

    this.featuresSubscription = this.teamService.features$.subscribe((features) => {
      this.connectChat(features);
      this.leaveDisabledFeature(features);
    });

    this.breakpointSubscription = this.breakpointObserver.observe(COMPACT_QUERY).subscribe((state) => {
      this.isCompact = state.matches;
      if (!this.isCompact) {
        this.closeNav(false);
      }
    });

    this.navigationSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.closeNav(false));
  }

  ngOnDestroy() {
    this.featuresSubscription?.unsubscribe();
    this.breakpointSubscription?.unsubscribe();
    this.navigationSubscription?.unsubscribe();
    this.unregisterEscape?.();
    this.unregisterEscape = null;
    this.teamChannelService.disconnect();
    this.notificationChannelService.disconnect();
    this.chatCableService.disconnect();
  }

  toggleNav() {
    if (this.isNavOpen) {
      this.closeNav(true);
    } else {
      this.openNav();
    }
  }

  openNav() {
    if (this.isNavOpen) {
      return;
    }
    this.navReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.isNavOpen = true;
    this.unregisterEscape = this.escapeService.push(() => this.closeNav(true));
    setTimeout(() => this.navTrap?.focusTrap.focusFirstTabbableElementWhenReady());
  }

  closeNav(restoreFocus: boolean) {
    if (!this.isNavOpen) {
      return;
    }
    this.isNavOpen = false;
    this.unregisterEscape?.();
    this.unregisterEscape = null;
    const returnFocus = this.navReturnFocus;
    this.navReturnFocus = null;
    if (restoreFocus && returnFocus?.isConnected) {
      returnFocus.focus();
    }
  }

  private connectChat(features: TeamFeatures) {
    const team = this.teamService.getCurrentTeam();
    if (team && features.chat) {
      this.chatCableService.connect(team.code);
    } else {
      this.chatCableService.disconnect();
    }
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
