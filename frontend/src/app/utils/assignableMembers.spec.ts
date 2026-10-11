import {assignableMembers} from "./assignableMembers";
import {TeamMember, TeamRole} from "@models/team.model";

function member(id: number, role: TeamRole): TeamMember {
  return {id, nickname: `M${id}`, role, avatar: {color: 'red', imageUrl: null}};
}

describe('assignableMembers', () => {
  const members = [member(1, 'owner'), member(2, 'admin'), member(3, 'user'), member(4, 'user')];

  it('offers everyone on a board without a project', () => {
    expect(assignableMembers(members, null).map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it('offers project members plus team owners and admins on a project board', () => {
    expect(assignableMembers(members, [3]).map((item) => item.id)).toEqual([1, 2, 3]);
  });
});
