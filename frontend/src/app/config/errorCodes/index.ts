import {COMMON_ERROR_CODES, CommonErrorCode} from "./common";
import {AUTH_ERROR_CODES, AuthErrorCode} from "./auth";
import {USERS_ERROR_CODES, UsersErrorCode} from "./users";
import {TEAMS_ERROR_CODES, TeamAccessErrorCode, TeamsErrorCode} from "./teams";
import {PAGES_ERROR_CODES, PagesErrorCode} from "./pages";
import {DIAGRAMS_ERROR_CODES, DiagramsErrorCode} from "./diagrams";
import {FOLDERS_ERROR_CODES, FoldersErrorCode} from "./folders";
import {BOARDS_ERROR_CODES, BoardsErrorCode} from "./boards";
import {TICKETS_ERROR_CODES, TicketsErrorCode} from "./tickets";
import {PRIORITIES_ERROR_CODES, PrioritiesErrorCode} from "./priorities";
import {TAGS_ERROR_CODES, TagsErrorCode} from "./tags";
import {FAVORITES_ERROR_CODES, FavoritesErrorCode} from "./favorites";
import {PROJECTS_ERROR_CODES, ProjectsErrorCode} from "./projects";
import {SEARCH_ERROR_CODES, SearchErrorCode} from "./search";
import {TEMPLATES_ERROR_CODES, TemplatesErrorCode} from "./templates";
import {TRASH_ERROR_CODES, TrashErrorCode} from "./trash";
import {COMMENTS_ERROR_CODES, CommentsErrorCode} from "./comments";

export const ERROR_CODES_BY_DOMAIN = {
  COMMON: COMMON_ERROR_CODES,
  AUTH: AUTH_ERROR_CODES,
  USERS: USERS_ERROR_CODES,
  TEAMS: TEAMS_ERROR_CODES,
  PAGES: PAGES_ERROR_CODES,
  DIAGRAMS: DIAGRAMS_ERROR_CODES,
  FOLDERS: FOLDERS_ERROR_CODES,
  BOARDS: BOARDS_ERROR_CODES,
  TICKETS: TICKETS_ERROR_CODES,
  PRIORITIES: PRIORITIES_ERROR_CODES,
  TAGS: TAGS_ERROR_CODES,
  FAVORITES: FAVORITES_ERROR_CODES,
  PROJECTS: PROJECTS_ERROR_CODES,
  SEARCH: SEARCH_ERROR_CODES,
  TEMPLATES: TEMPLATES_ERROR_CODES,
  TRASH: TRASH_ERROR_CODES,
  COMMENTS: COMMENTS_ERROR_CODES,
} as const;

export type ErrorDomain = keyof typeof ERROR_CODES_BY_DOMAIN;

export type ErrorCode =
  | CommonErrorCode
  | AuthErrorCode
  | UsersErrorCode
  | TeamsErrorCode
  | PagesErrorCode
  | DiagramsErrorCode
  | FoldersErrorCode
  | BoardsErrorCode
  | TicketsErrorCode
  | PrioritiesErrorCode
  | TagsErrorCode
  | FavoritesErrorCode
  | ProjectsErrorCode
  | SearchErrorCode
  | TemplatesErrorCode
  | TrashErrorCode
  | CommentsErrorCode;

export type {
  CommonErrorCode,
  AuthErrorCode,
  UsersErrorCode,
  TeamsErrorCode,
  TeamAccessErrorCode,
  PagesErrorCode,
  DiagramsErrorCode,
  FoldersErrorCode,
  BoardsErrorCode,
  TicketsErrorCode,
  PrioritiesErrorCode,
  TagsErrorCode,
  FavoritesErrorCode,
  ProjectsErrorCode,
  SearchErrorCode,
  TemplatesErrorCode,
  TrashErrorCode,
  CommentsErrorCode,
};
