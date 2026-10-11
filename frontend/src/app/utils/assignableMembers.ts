import {TeamMember} from "@models/team.model";

export function assignableMembers(members: TeamMember[], projectMemberIds: number[] | null): TeamMember[] {
  if (projectMemberIds === null) {
    return members;
  }
  return members.filter((member) => member.role !== 'user' || projectMemberIds.includes(member.id));
}
