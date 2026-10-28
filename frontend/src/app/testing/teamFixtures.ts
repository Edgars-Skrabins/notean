import {Team} from "@models/team.model";
import {RawTeam} from "@services/team.service";

export function testTeam(overrides: Partial<Team> = {}): Team {
  return {id: 1, name: 'Team A', code: 'aaa', pagesEnabled: true, diagramsEnabled: true, boardsEnabled: true, chatEnabled: true, ...overrides};
}

export function rawTestTeam(overrides: Partial<RawTeam> = {}): RawTeam {
  return {id: 1, name: 'Team A', code: 'aaa', pages_enabled: true, diagrams_enabled: true, boards_enabled: true, chat_enabled: true, ...overrides};
}
