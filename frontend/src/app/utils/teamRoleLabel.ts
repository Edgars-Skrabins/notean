import {PHRASES} from "@config/phrases";
import {TeamRole} from "@models/team.model";

export function teamRoleLabel(role: TeamRole): string {
  switch (role) {
    case 'owner':
      return PHRASES.ROLE_OWNER;
    case 'admin':
      return PHRASES.ROLE_ADMIN;
    case 'user':
      return PHRASES.ROLE_USER;
  }
}
