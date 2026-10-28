import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {PHRASES} from "@config/phrases";
import {TEAM_LINK_PARAM} from "../guards/team-link.guard";

@Injectable({
  providedIn: 'root',
})
export class CopyLinkService {
  constructor(
    private router: Router,
    private teamService: TeamService,
    private toastService: ToastService
  ) {
  }

  currentLink(): string {
    const tree = this.router.parseUrl(this.router.url);
    tree.queryParams = {[TEAM_LINK_PARAM]: this.teamService.getCurrentTeamCode()};
    tree.fragment = null;
    return `${window.location.origin}${this.router.serializeUrl(tree)}`;
  }

  copyCurrentLink(): Promise<void> {
    return navigator.clipboard.writeText(this.currentLink())
      .then(() => {
        this.toastService.show({type: ToastType.SUCCESS, message: PHRASES.LINK_COPIED});
      })
      .catch(() => {
        this.toastService.show({type: ToastType.ERROR, message: PHRASES.LINK_COPY_FAILED});
      });
  }
}
