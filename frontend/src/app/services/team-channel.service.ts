import {Injectable} from '@angular/core';
import {Subscription} from '@rails/actioncable';
import {CableService} from "@services/cable.service";
import {mapTeam, RawTeam, TeamService} from "@services/team.service";

interface TeamChannelMessage {
  type: 'features_changed';
  team: RawTeam;
}

@Injectable({
  providedIn: 'root',
})
export class TeamChannelService {
  private subscription: Subscription | null = null;

  constructor(private cableService: CableService, private teamService: TeamService) {
  }

  connect(teamCode: string) {
    this.disconnect();

    this.subscription = this.cableService.subscribe(
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
    this.subscription = null;
  }
}
