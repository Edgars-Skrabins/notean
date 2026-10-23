import {TeamFeature} from "@models/team.model";
import {AppRoutes} from "../app/app-routes.enum";

const FEATURE_SEGMENTS: Record<string, TeamFeature> = {
  [AppRoutes.DOCUMENT_PAGES]: 'pages',
  [AppRoutes.DIAGRAMS]: 'diagrams',
  [AppRoutes.BOARDS]: 'boards',
};

export function routeFeature(url: string): TeamFeature | null {
  const [first, second] = url.split(/[?#]/)[0].split('/').filter(Boolean);
  if (first !== AppRoutes.DASHBOARD || !second) {
    return null;
  }

  return FEATURE_SEGMENTS[second] ?? null;
}
