import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {NgFor, NgIf} from '@angular/common';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
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

describe('ProjectFormComponent name error', () => {
  function render(nameError: string) {
    const fixture = TestBed.createComponent(ProjectFormComponent);
    fixture.componentRef.setInput('params', {name: 'Game', description: '', ownerUserId: 1, memberIds: [1]});
    fixture.componentRef.setInput('members', [member(1, 'Alice')]);
    fixture.componentRef.setInput('nameError', nameError);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectFormComponent],
      providers: [provideTranslateService()],
    })
      .overrideComponent(ProjectFormComponent, {set: {imports: [FormsModule, NgFor, NgIf, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
  });

  it('marks the name input invalid and points it at the announced error', () => {
    const fixture = render('ERRORS.PROJECTS.PROJECT_NAME_TAKEN');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#projectName');
    const error = fixture.nativeElement.querySelector('#' + input.getAttribute('aria-describedby'));
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent.trim()).toBe('ERRORS.PROJECTS.PROJECT_NAME_TAKEN');
  });

  it('leaves the name input without error attributes when there is no error', () => {
    const fixture = render('');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#projectName');
    expect(input.hasAttribute('aria-invalid')).toBeFalse();
    expect(input.hasAttribute('aria-describedby')).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
