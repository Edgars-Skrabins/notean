import {Injectable} from '@angular/core';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {baseUrl} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";
import {mapTeam, RawTeam, TeamService} from "@services/team.service";

interface TeamChannelMessage {
  type: 'features_changed';
  team: RawTeam;
}

@Injectable({
  providedIn: 'root',
})
export class TeamChannelService {
  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;

  constructor(private authService: AuthService, private teamService: TeamService) {
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
    }
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.consumer?.disconnect();
    this.subscription = null;
    this.consumer = null;
  }
}
