import {AppRoutes} from "../app/app-routes.enum";

export function chatChannelRoute(channelId: number): (string | number)[] {
  return ['/', AppRoutes.DASHBOARD, AppRoutes.CHAT, channelId];
}
