import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {TranslateService} from "@ngx-translate/core";
import {baseUrl} from "@config/axiosConfig";
import {PHRASES} from "@config/phrases";
import {AuthService} from "@services/auth.service";
import {mapTeam, RawTeam, TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {NavigationService} from "@services/navigation.service";
import {ToastType} from "@models/toast.model";
import {AppRoutes} from "../app/app-routes.enum";

type TeamChannelMessage =
  | { type: 'features_changed'; team: RawTeam }
  | { type: 'member_removed'; user_id: number; team: RawTeam }
  | { type: 'members_changed' };

@Injectable({
  providedIn: 'root',
})
export class TeamChannelService {
  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;
  private membersChangedSubject = new Subject<void>();

  readonly membersChanged$: Observable<void> = this.membersChangedSubject.asObservable();

  constructor(
    private authService: AuthService,
    private teamService: TeamService,
    private toastService: ToastService,
    private navigationService: NavigationService,
    private translateService: TranslateService
  ) {
  }

  connect(teamCode: string) {
    this.disconnect();

    const token = this.authService.getToken();
    const cableUrl = baseUrl.replace(/^http/, 'ws') + `/cable?token=${token}`;

    this.consumer = createConsumer(cableUrl);
    this.subscription = this.consumer.subscriptions.create(
      {channel: 'TeamChannel', team_code: teamCode},
      {
        received: (data: TeamChannelMessage) => this.handleMessage(data),
      }
    );
  }

  handleMessage(data: TeamChannelMessage) {
    if (data.type === 'features_changed') {
      this.teamService.applyFeatures(mapTeam(data.team));
    } else if (data.type === 'member_removed') {
      this.handleMemberRemoved(data.user_id, data.team.name, data.team.code);
    } else if (data.type === 'members_changed') {
      this.membersChangedSubject.next();
    }
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.consumer?.disconnect();
    this.subscription = null;
    this.consumer = null;
  }

  private handleMemberRemoved(userId: number, teamName: string, teamCode: string) {
    if (userId !== this.authService.getCurrentUser()?.id) {
      this.membersChangedSubject.next();
      return;
    }

    if (teamCode !== this.teamService.getCurrentTeam()?.code) {
      return;
    }

    this.disconnect();
    this.teamService.clearCurrentTeam();
    this.toastService.show({type: ToastType.INFO, message: this.translateService.instant(PHRASES.REMOVED_FROM_TEAM, {team: teamName})});
    this.navigationService.navigate(AppRoutes.TEAM_SELECTION);
  }
}
