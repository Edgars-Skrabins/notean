import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NgFor, NgIf} from '@angular/common';
import {Subject} from 'rxjs';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
import {ManageTeamComponent} from "./manage-team.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {TeamChannelService} from "@services/team-channel.service";
import {AttachmentService} from "@services/attachment.service";
import {TranslateService} from "@ngx-translate/core";
import {ToastType} from "@models/toast.model";
import {TeamMember, TeamRole} from "@models/team.model";
import {PHRASES} from "@config/phrases";
import {AppRoutes} from "../../app/app-routes.enum";
import {testTeam} from "../../testing/teamFixtures";
import {TeamCodeDisplayComponent} from "@components/team-code-display/team-code-display.component";
import {ButtonComponent} from "@components/button/button.component";

function teamServiceSpy() {
  const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam', 'getCurrentRole', 'fetchTeamMembers', 'isFeatureEnabled', 'updateFeatures', 'removeMember', 'updateMemberRole', 'transferOwnership', 'renameTeam', 'deleteTeam', 'fetchMyTeam']);
  teamService.getCurrentTeam.and.returnValue(testTeam({id: 1, name: 'Team A', code: 'aaa'}));
  teamService.fetchTeamMembers.and.returnValue(Promise.resolve([]));
  teamService.isFeatureEnabled.and.callFake((feature) => feature !== 'diagrams');
  return teamService;
}

function attachmentServiceStub() {
  const service = jasmine.createSpyObj<AttachmentService>('AttachmentService', ['storageUsage']);
  service.storageUsage.and.returnValue(Promise.resolve({success: true, storage: {usedBytes: 12.5 * 1024 * 1024, quotaBytes: 500 * 1024 * 1024}}));
  return service;
}

function teamChannelServiceStub() {
  const membersChanged = new Subject<void>();
  const service = jasmine.createSpyObj<TeamChannelService>('TeamChannelService', ['connect', 'disconnect'], {membersChanged$: membersChanged.asObservable()});
  return {service, membersChanged};
}

function member(id: number, role: TeamRole): TeamMember {
  return {id, nickname: `Member${id}`, role, avatar: {color: 'lime', imageUrl: null}};
}

describe('ManageTeamComponent.isOwner', () => {
  let component: ManageTeamComponent;
  let teamService: jasmine.SpyObj<TeamService>;

  beforeEach(() => {
    teamService = teamServiceSpy();
    component = new ManageTeamComponent({} as NavigationService, teamService, {} as TranslateService, {} as ToastService, teamChannelServiceStub().service, attachmentServiceStub());
  });

  it('returns false when the current role is user', () => {
    teamService.getCurrentRole.and.returnValue('user');

    expect(component.isOwner).toBeFalse();
  });

  it('returns false when the current role is admin', () => {
    teamService.getCurrentRole.and.returnValue('admin');

    expect(component.isOwner).toBeFalse();
  });

  it('returns true when the current role is owner', () => {
    teamService.getCurrentRole.and.returnValue('owner');

    expect(component.isOwner).toBeTrue();
  });
});

describe('ManageTeamComponent features', () => {
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;

  function render(role: TeamRole) {
    teamService.getCurrentRole.and.returnValue(role);
    const fixture = TestBed.createComponent(ManageTeamComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    teamService = teamServiceSpy();
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    await TestBed.configureTestingModule({
      imports: [ManageTeamComponent],
      providers: [
        provideTranslateService(),
        {provide: TeamService, useValue: teamService},
        {provide: ToastService, useValue: toastService},
        {provide: NavigationService, useValue: {}},
        {provide: TeamChannelService, useValue: teamChannelServiceStub().service},
        {provide: AttachmentService, useValue: attachmentServiceStub()},
      ],
    })
      .overrideComponent(ManageTeamComponent, {set: {imports: [NgFor, NgIf, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
  });

  it('shows the team storage usage', async () => {
    const fixture = render('admin');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.storageParams).toEqual({used: '13 MB', quota: '500 MB'});
    expect(fixture.nativeElement.querySelector('.manageTeam__storage')).not.toBeNull();
  });

  it('shows the Features toggles with the current flags to the owner only', () => {
    const owner = render('owner');
    const switches = Array.from(owner.nativeElement.querySelectorAll('app-switch')) as HTMLElement[];
    expect(switches.length).toBe(4);
    expect(owner.componentInstance.features).toEqual({pages: true, diagrams: false, boards: true, chat: true});

    expect(render('admin').nativeElement.querySelectorAll('app-switch').length).toBe(0);
    expect(render('user').nativeElement.querySelectorAll('app-switch').length).toBe(0);
  });

  it('saves a toggle with updateFeatures and shows a success toast', async () => {
    teamService.updateFeatures.and.returnValue(Promise.resolve({success: true, team: testTeam({boardsEnabled: false})}));
    const component = render('owner').componentInstance;

    await component.handleFeatureChange('boards', false);

    expect(teamService.updateFeatures).toHaveBeenCalledOnceWith('aaa', {boards: false});
    expect(component.features.boards).toBeFalse();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.FEATURES_UPDATED});
  });

  it('reverts the toggle and shows an error toast when saving fails', async () => {
    teamService.updateFeatures.and.returnValue(Promise.resolve({success: false, code: 'FORBIDDEN'}));
    const component = render('owner').componentInstance;

    await component.handleFeatureChange('pages', false);

    expect(component.features.pages).toBeTrue();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.ERROR, message: 'ERRORS.COMMON.FORBIDDEN'});
  });
});

describe('ManageTeamComponent sections', () => {
  let teamService: jasmine.SpyObj<TeamService>;

  async function render(role: TeamRole) {
    teamService.getCurrentRole.and.returnValue(role);
    const fixture = TestBed.createComponent(ManageTeamComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function sectionTitles(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('.manageTeam__sectionTitle, .manageTeam__dangerTitle')).map((title) => title.textContent!.trim());
  }

  beforeEach(async () => {
    teamService = teamServiceSpy();
    await TestBed.configureTestingModule({
      imports: [ManageTeamComponent],
      providers: [
        provideTranslateService(),
        {provide: TeamService, useValue: teamService},
        {provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['show'])},
        {provide: NavigationService, useValue: {}},
        {provide: TeamChannelService, useValue: teamChannelServiceStub().service},
        {provide: AttachmentService, useValue: attachmentServiceStub()},
      ],
    })
      .overrideComponent(ManageTeamComponent, {set: {imports: [NgFor, NgIf, TranslatePipe, TeamCodeDisplayComponent, ButtonComponent], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {GENERAL: 'General', TEAM_MEMBERS: 'Members', FEATURES: 'Features', STORAGE: 'Storage', DANGER_ZONE: 'Danger zone', STORAGE_USAGE: '{{used}} of {{quota}} used'});
    translate.use('en');
  });

  it('shows General, Members, Features, Storage and Danger zone in that order to the owner', async () => {
    const fixture = await render('owner');

    expect(sectionTitles(fixture.nativeElement)).toEqual(['General', 'Members', 'Features', 'Storage', 'Danger zone']);
  });

  it('shows an admin General, Members and Storage only', async () => {
    const fixture = await render('admin');

    expect(sectionTitles(fixture.nativeElement)).toEqual(['General', 'Members', 'Storage']);
    expect(fixture.nativeElement.querySelector('.manageTeam__danger')).toBeNull();
  });

  it('shows the compact team code inside the Members section', async () => {
    const fixture = await render('admin');
    const sections = Array.from(fixture.nativeElement.querySelectorAll('.manageTeam__section')) as HTMLElement[];
    const membersSection = sections.find((section) => section.querySelector('.manageTeam__sectionTitle')?.textContent?.trim() === 'Members')!;

    expect(membersSection.querySelector('app-team-code-display .teamCodeDisplay--compact')).not.toBeNull();
  });

  it('shows the storage figure under the Storage heading', async () => {
    const fixture = await render('admin');
    const storage = fixture.nativeElement.querySelector('.manageTeam__storage') as HTMLElement;

    expect(storage.textContent!.trim()).toBe('13 MB of 500 MB used');
    expect(storage.closest('section')!.querySelector('.manageTeam__sectionTitle')!.textContent!.trim()).toBe('Storage');
  });

  it('opens the delete confirm from the Danger zone button', async () => {
    const fixture = await render('owner');

    (fixture.nativeElement.querySelector('.manageTeam__danger app-button button') as HTMLButtonElement).click();

    expect(fixture.componentInstance.showDeleteConfirm).toBeTrue();
  });
});

describe('ManageTeamComponent member actions', () => {
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let translateService: jasmine.SpyObj<TranslateService>;
  let channel: ReturnType<typeof teamChannelServiceStub>;
  let component: ManageTeamComponent;

  function build(role: TeamRole) {
    teamService.getCurrentRole.and.returnValue(role);
    component = new ManageTeamComponent({} as NavigationService, teamService, translateService, toastService, channel.service, attachmentServiceStub());
    return component;
  }

  beforeEach(() => {
    teamService = teamServiceSpy();
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    translateService = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translateService.instant.and.callFake((key: string | string[], params?: object) => `${key} ${JSON.stringify(params)}`);
    channel = teamChannelServiceStub();
  });

  it('gives the owner role, transfer and remove actions on users and admins, and nothing on the owner', () => {
    build('owner');

    expect(component.actionsFor(member(2, 'user'))).toEqual(['make_admin', 'transfer_ownership', 'remove']);
    expect(component.actionsFor(member(3, 'admin'))).toEqual(['make_user', 'transfer_ownership', 'remove']);
    expect(component.actionsFor(member(1, 'owner'))).toEqual([]);
  });

  it('gives an admin only remove on users, and nothing on admins or the owner', () => {
    build('admin');

    expect(component.actionsFor(member(2, 'user'))).toEqual(['remove']);
    expect(component.actionsFor(member(3, 'admin'))).toEqual([]);
    expect(component.actionsFor(member(1, 'owner'))).toEqual([]);
  });

  it('builds a menu only for members with allowed actions', async () => {
    teamService.fetchTeamMembers.and.returnValue(Promise.resolve([member(1, 'owner'), member(2, 'user')]));
    build('admin').ngOnInit();
    await Promise.resolve();

    expect(component.memberActions[1]).toEqual([]);
    expect(component.memberActions[2]).toEqual([{value: 'remove', labelKey: PHRASES.REMOVE_FROM_TEAM}]);
  });

  it('asks for confirmation with the member name before acting', () => {
    build('owner');

    component.handleMemberAction(member(2, 'user'), 'transfer_ownership');

    expect(component.pendingActionMessage).toBe(`${PHRASES.CONFIRM_TRANSFER_OWNERSHIP} {"name":"Member2"}`);
    expect(component.pendingActionLabel).toBe(PHRASES.TRANSFER_OWNERSHIP);
    expect(teamService.transferOwnership).not.toHaveBeenCalled();
  });

  it('removes a confirmed member, updates the list and toasts', async () => {
    teamService.removeMember.and.returnValue(Promise.resolve({success: true, members: [member(1, 'owner')]}));
    build('owner');
    component.handleMemberAction(member(2, 'user'), 'remove');

    await component.handleConfirmMemberAction();

    expect(teamService.removeMember).toHaveBeenCalledOnceWith('aaa', 2);
    expect(component.members).toEqual([member(1, 'owner')]);
    expect(component.pendingAction).toBeNull();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.MEMBER_REMOVED});
  });

  it('changes a role with the matching role', async () => {
    teamService.updateMemberRole.and.returnValue(Promise.resolve({success: true, members: [member(3, 'user')]}));
    build('owner');
    component.handleMemberAction(member(3, 'admin'), 'make_user');

    await component.handleConfirmMemberAction();

    expect(teamService.updateMemberRole).toHaveBeenCalledOnceWith('aaa', 3, 'user');
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.MEMBER_ROLE_UPDATED});
  });

  it('recomputes actions as an admin after transferring ownership', async () => {
    teamService.transferOwnership.and.callFake(() => {
      teamService.getCurrentRole.and.returnValue('admin');
      return Promise.resolve({success: true, members: [member(1, 'admin'), member(2, 'owner'), member(3, 'user')], role: 'admin'});
    });
    build('owner');
    component.handleMemberAction(member(2, 'user'), 'transfer_ownership');

    await component.handleConfirmMemberAction();

    expect(component.memberActions[2]).toEqual([]);
    expect(component.memberActions[3]).toEqual([{value: 'remove', labelKey: PHRASES.REMOVE_FROM_TEAM}]);
  });

  it('shows the translated error in the alert area when an action fails', async () => {
    teamService.removeMember.and.returnValue(Promise.resolve({success: false, code: 'CANNOT_MANAGE_ADMIN'}));
    build('admin');
    component.handleMemberAction(member(2, 'user'), 'remove');

    await component.handleConfirmMemberAction();

    expect(component.alertMessage).toBe('ERRORS.TEAMS.CANNOT_MANAGE_ADMIN');
    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('shows a success toast and clears the error after renaming the team', async () => {
    teamService.renameTeam.and.returnValue(Promise.resolve({success: true, team: testTeam({id: 1, name: 'Team B', code: 'aaa'})}));
    build('owner');
    component.alertMessage = 'ERRORS.COMMON.FORBIDDEN';
    component.teamName = 'Team B';

    component.handleRenameTeam();
    await Promise.resolve();

    expect(teamService.renameTeam).toHaveBeenCalledOnceWith('aaa', 'Team B');
    expect(component.alertMessage).toBe('');
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.TEAM_NAME_UPDATED});
  });

  it('shows a rename failure inline without a toast', async () => {
    teamService.renameTeam.and.returnValue(Promise.resolve({success: false, code: 'FORBIDDEN'}));
    build('owner');
    component.teamName = 'Team B';

    component.handleRenameTeam();
    await Promise.resolve();

    expect(component.alertMessage).toBe('ERRORS.COMMON.FORBIDDEN');
    expect(toastService.show).not.toHaveBeenCalled();
  });

  it('leaves the team channel to the dashboard but reloads members on membersChanged$ until destroyed', () => {
    build('owner').ngOnInit();
    expect(channel.service.connect).not.toHaveBeenCalled();
    expect(teamService.fetchTeamMembers).toHaveBeenCalledTimes(1);

    channel.membersChanged.next();
    expect(teamService.fetchTeamMembers).toHaveBeenCalledTimes(2);

    component.ngOnDestroy();
    channel.membersChanged.next();
    expect(teamService.fetchTeamMembers).toHaveBeenCalledTimes(2);
    expect(channel.service.disconnect).not.toHaveBeenCalled();
  });
});

describe('ManageTeamComponent.handleConfirmDeleteTeam', () => {
  let teamService: jasmine.SpyObj<TeamService>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let component: ManageTeamComponent;

  beforeEach(() => {
    teamService = teamServiceSpy();
    teamService.getCurrentRole.and.returnValue('owner');
    teamService.deleteTeam.and.returnValue(Promise.resolve({success: true}));
    navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['navigate', 'reloadAt']);
    component = new ManageTeamComponent(navigationService, teamService, {} as TranslateService, {} as ToastService, teamChannelServiceStub().service, attachmentServiceStub());
  });

  async function confirmDelete() {
    component.handleConfirmDeleteTeam();
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('reloads the app into the next team Home when another team remains', async () => {
    teamService.fetchMyTeam.and.returnValue(Promise.resolve(testTeam({id: 2, name: 'Team B', code: 'bbb'})));

    await confirmDelete();

    expect(teamService.deleteTeam).toHaveBeenCalledOnceWith('aaa');
    expect(navigationService.reloadAt).toHaveBeenCalledOnceWith('/dashboard/home');
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('goes to Team selection when no team remains', async () => {
    teamService.fetchMyTeam.and.returnValue(Promise.resolve(null));

    await confirmDelete();

    expect(navigationService.navigate).toHaveBeenCalledOnceWith(AppRoutes.TEAM_SELECTION);
    expect(navigationService.reloadAt).not.toHaveBeenCalled();
  });

  it('stays on the screen with the error when the delete fails', async () => {
    teamService.deleteTeam.and.returnValue(Promise.resolve({success: false, code: 'TEAM_NOT_FOUND'}));

    await confirmDelete();

    expect(component.alertMessage).toBe('ERRORS.TEAMS.TEAM_NOT_FOUND');
    expect(teamService.fetchMyTeam).not.toHaveBeenCalled();
    expect(navigationService.reloadAt).not.toHaveBeenCalled();
  });
});
