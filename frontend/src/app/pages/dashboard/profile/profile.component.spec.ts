import {fakeAsync, tick} from "@angular/core/testing";
import {ProfileComponent} from "./profile.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {ToastType} from "@models/toast.model";
import {NicknameError} from "@models/team.model";
import {PHRASES} from "@config/phrases";

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentNickname', 'updateNickname']);
    teamService.getCurrentNickname.and.returnValue('Alice');
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    component = new ProfileComponent({} as NavigationService, teamService, toastService);
  });

  it('starts from the active team nickname with no unsaved changes', () => {
    expect(component.savedNickname).toBe('Alice');
    expect(component.nickname).toBe('Alice');
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('has unsaved changes as soon as the field differs', () => {
    component.nickname = 'Ally';

    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('does nothing on save without unsaved changes', () => {
    component.handleSave();

    expect(teamService.updateNickname).not.toHaveBeenCalled();
  });

  it('shows a toast and sends nothing when the nickname is invalid', () => {
    component.nickname = 'Al1ce';

    component.handleSave();

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_INVALID_CHARACTERS});
    expect(teamService.updateNickname).not.toHaveBeenCalled();
  });

  it('saves the trimmed nickname and shows a success toast', fakeAsync(() => {
    teamService.updateNickname.and.returnValue(Promise.resolve({success: true, nickname: 'Ally'}));
    component.nickname = ' Ally ';

    component.handleSave();
    expect(component.isSaving).toBeTrue();
    tick();

    expect(teamService.updateNickname).toHaveBeenCalledWith('Ally');
    expect(component.savedNickname).toBe('Ally');
    expect(component.nickname).toBe('Ally');
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.isSaving).toBeFalse();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.SUCCESS, message: PHRASES.PROFILE_UPDATED});
  }));

  it('keeps the value dirty and shows an error toast when saving fails', fakeAsync(() => {
    teamService.updateNickname.and.returnValue(Promise.resolve({success: false, error: NicknameError.TAKEN}));
    component.nickname = 'Bob';

    component.handleSave();
    tick();

    expect(component.savedNickname).toBe('Alice');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.NICKNAME_TAKEN});
  }));

  it('allows leaving straight away without unsaved changes', () => {
    expect(component.confirmLeave()).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('asks before leaving with unsaved changes and resolves true on Leave', async () => {
    component.nickname = 'Ally';

    const result = component.confirmLeave();
    expect(component.isLeaveConfirmOpen).toBeTrue();
    component.handleConfirmLeave();

    expect(await result).toBeTrue();
    expect(component.isLeaveConfirmOpen).toBeFalse();
  });

  it('resolves false on Cancel', async () => {
    component.nickname = 'Ally';

    const result = component.confirmLeave();
    component.handleCancelLeave();

    expect(await result).toBeFalse();
  });
});
