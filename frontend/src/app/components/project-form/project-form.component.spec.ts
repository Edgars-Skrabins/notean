import {ProjectFormComponent} from './project-form.component';
import {ProjectParams} from '@models/project.model';
import {TeamMember} from '@models/team.model';

function member(id: number, nickname: string): TeamMember {
  return {id, nickname, role: 'user', avatar: {color: 'red', imageUrl: null}};
}

describe('ProjectFormComponent', () => {
  let component: ProjectFormComponent;
  let emitted: ProjectParams[];

  beforeEach(() => {
    component = new ProjectFormComponent();
    component.members = [member(1, 'Alice'), member(2, 'Bob'), member(3, 'Carol')];
    component.params = {name: 'Game', description: '', ownerUserId: 1, memberIds: [1]};
    emitted = [];
    component.paramsChange.subscribe((params) => emitted.push(params));
  });

  it('always treats the owner as a member', () => {
    expect(component.isMember(1)).toBeTrue();
    expect(component.isMember(2)).toBeFalse();
  });

  it('adds the new owner to the members', () => {
    component.handleOwnerChange(3);

    expect(emitted[0]).toEqual({name: 'Game', description: '', ownerUserId: 3, memberIds: [1, 3]});
  });

  it('ticks and unticks members', () => {
    component.handleMemberToggle(2, true);
    component.params = emitted[0];
    component.handleMemberToggle(2, false);

    expect(emitted[0].memberIds).toEqual([1, 2]);
    expect(emitted[1].memberIds).toEqual([1]);
  });

  it('describes the owner and members for read-only viewers', () => {
    component.params = {...component.params, memberIds: [1, 3]};

    expect(component.ownerNickname).toBe('Alice');
    expect(component.memberNicknames).toBe('Alice, Carol');
  });
});
