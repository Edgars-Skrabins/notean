import {fakeAsync, tick} from "@angular/core/testing";
import {BehaviorSubject} from "rxjs";
import {ProfileComponent} from "./profile.component";
import {NavigationService} from "@services/navigation.service";
import {TeamService} from "@services/team.service";
import {ToastService} from "@services/toast.service";
import {AvatarService} from "@services/avatar.service";
import {AuthService} from "@services/auth.service";
import {ToastType} from "@models/toast.model";
import {Avatar} from "@models/avatar.model";
import {PHRASES} from "@config/phrases";
import {escapeServiceStub} from "../../../testing/escapeServiceStub";

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let teamService: jasmine.SpyObj<TeamService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let avatarService: jasmine.SpyObj<AvatarService>;
  let avatarSubject: BehaviorSubject<Avatar | null>;
  let authService: jasmine.SpyObj<AuthService>;

  function imageEvent(file: File): Event {
    const input = document.createElement('input');
    input.type = 'file';
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    return {target: input} as unknown as Event;
  }

  beforeEach(() => {
    teamService = jasmine.createSpyObj('TeamService', ['getCurrentNickname', 'updateNickname']);
    teamService.getCurrentNickname.and.returnValue('Alice');
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    avatarSubject = new BehaviorSubject<Avatar | null>({color: 'blue', imageUrl: null});
    avatarService = jasmine.createSpyObj<AvatarService>('AvatarService', ['getAvatar', 'update'], {avatar$: avatarSubject});
    avatarService.getAvatar.and.callFake(() => avatarSubject.value);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['changePassword']);
    component = new ProfileComponent({} as NavigationService, teamService, toastService, avatarService, escapeServiceStub().service, authService);
  });

  afterEach(() => {
    component.ngOnDestroy();
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
    teamService.updateNickname.and.returnValue(Promise.resolve({success: false, code: 'NICKNAME_TAKEN'}));
    component.nickname = 'Bob';

    component.handleSave();
    tick();

    expect(component.savedNickname).toBe('Alice');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: 'ERRORS.TEAMS.NICKNAME_TAKEN'});
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

  it('starts with the saved avatar colour and no avatar changes', () => {
    expect(component.pendingColor).toBe('blue');
    expect(component.hasAvatarChanges).toBeFalse();
  });

  it('picks up the avatar once it loads', () => {
    avatarSubject.next({color: 'pink', imageUrl: '/img'});

    expect(component.pendingColor).toBe('pink');
    expect(component.hasImage).toBeTrue();
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('has unsaved changes after picking another colour', () => {
    component.handleSelectColor('green');

    expect(component.hasUnsavedChanges).toBeTrue();
    expect(component.previewAvatar).toEqual({color: 'green', imageUrl: null});
  });

  it('has unsaved changes with a pending image and previews it', () => {
    component.handleFileSelected(imageEvent(new File(['x'], 'a.png', {type: 'image/png'})));

    expect(component.pendingImage).not.toBeNull();
    expect(component.pendingImagePreviewUrl).toMatch(/^blob:/);
    expect(component.hasImage).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('refuses an image of the wrong type with a toast', () => {
    component.handleFileSelected(imageEvent(new File(['x'], 'a.gif', {type: 'image/gif'})));

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.IMAGE_INVALID_TYPE});
    expect(component.pendingImage).toBeNull();
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('refuses an image over 2 MB with a toast', () => {
    const large = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png', {type: 'image/png'});

    component.handleFileSelected(imageEvent(large));

    expect(toastService.show).toHaveBeenCalledWith({type: ToastType.ERROR, message: PHRASES.IMAGE_TOO_LARGE});
    expect(component.pendingImage).toBeNull();
  });

  it('removing the saved image is a pending change', () => {
    avatarSubject.next({color: 'pink', imageUrl: '/img'});

    component.handleRemoveImage();

    expect(component.pendingRemoveImage).toBeTrue();
    expect(component.hasImage).toBeFalse();
    expect(component.previewAvatar).toEqual({color: 'pink', imageUrl: null});
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('removing a pending image without a saved one leaves nothing pending', () => {
    component.handleFileSelected(imageEvent(new File(['x'], 'a.png', {type: 'image/png'})));

    component.handleRemoveImage();

    expect(component.pendingImage).toBeNull();
    expect(component.pendingRemoveImage).toBeFalse();
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('saves the avatar changes and shows one success toast', fakeAsync(() => {
    avatarService.update.and.returnValue(Promise.resolve({success: true, avatar: {color: 'green', imageUrl: '/new'}}));
    const image = new File(['x'], 'a.png', {type: 'image/png'});
    component.handleSelectColor('green');
    component.handleFileSelected(imageEvent(image));

    component.handleSave();
    tick();

    expect(teamService.updateNickname).not.toHaveBeenCalled();
    expect(avatarService.update).toHaveBeenCalledWith({color: 'green', image});
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.pendingImagePreviewUrl).toBeNull();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.PROFILE_UPDATED});
  }));

  it('saves the nickname and the avatar together with one toast', fakeAsync(() => {
    teamService.updateNickname.and.returnValue(Promise.resolve({success: true, nickname: 'Ally'}));
    avatarService.update.and.returnValue(Promise.resolve({success: true, avatar: {color: 'red', imageUrl: null}}));
    component.nickname = 'Ally';
    component.handleSelectColor('red');

    component.handleSave();
    tick();

    expect(teamService.updateNickname).toHaveBeenCalledWith('Ally');
    expect(avatarService.update).toHaveBeenCalledWith({color: 'red'});
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.PROFILE_UPDATED});
  }));

  it('sends remove_image when the saved image is removed', fakeAsync(() => {
    avatarSubject.next({color: 'pink', imageUrl: '/img'});
    avatarService.update.and.returnValue(Promise.resolve({success: true, avatar: {color: 'pink', imageUrl: null}}));
    component.handleRemoveImage();

    component.handleSave();
    tick();

    expect(avatarService.update).toHaveBeenCalledWith({removeImage: true});
  }));

  it('keeps the pending avatar changes and shows an error toast when the avatar fails', fakeAsync(() => {
    avatarService.update.and.returnValue(Promise.resolve({success: false, code: 'AVATAR_IMAGE_INVALID'}));
    component.handleSelectColor('green');

    component.handleSave();
    tick();

    expect(component.pendingColor).toBe('green');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(component.isSaving).toBeFalse();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.ERROR, message: PHRASES.AVATAR_UPDATE_FAILED});
  }));

  it('asks before leaving with a pending colour', () => {
    component.handleSelectColor('green');

    component.confirmLeave();

    expect(component.isLeaveConfirmOpen).toBeTrue();
  });

  function fillPasswords(current: string, next: string, confirmation: string) {
    component.currentPassword = current;
    component.newPassword = next;
    component.confirmNewPassword = confirmation;
  }

  it('can only change the password once all three fields are filled', () => {
    expect(component.canChangePassword).toBeFalse();

    fillPasswords('oldpassword', 'newpassword', '');
    expect(component.canChangePassword).toBeFalse();

    fillPasswords('oldpassword', 'newpassword', 'newpassword');
    expect(component.canChangePassword).toBeTrue();
  });

  it('shows a mismatch error without sending a request', fakeAsync(() => {
    fillPasswords('oldpassword', 'newpassword', 'otherpassword');

    component.handleChangePassword();
    tick();

    expect(component.passwordError).toBe(PHRASES.PASSWORDS_DO_NOT_MATCH);
    expect(authService.changePassword).not.toHaveBeenCalled();
  }));

  it('shows a too short error without sending a request', fakeAsync(() => {
    fillPasswords('oldpassword', 'short', 'short');

    component.handleChangePassword();
    tick();

    expect(component.passwordError).toBe(PHRASES.PASSWORD_TOO_SHORT);
    expect(authService.changePassword).not.toHaveBeenCalled();
  }));

  it('clears the fields and toasts after changing the password', fakeAsync(() => {
    authService.changePassword.and.returnValue(Promise.resolve({success: true}));
    fillPasswords('oldpassword', 'newpassword', 'newpassword');

    component.handleChangePassword();
    tick();

    expect(authService.changePassword).toHaveBeenCalledOnceWith('oldpassword', 'newpassword');
    expect(component.currentPassword).toBe('');
    expect(component.newPassword).toBe('');
    expect(component.confirmNewPassword).toBe('');
    expect(component.passwordError).toBeNull();
    expect(component.isChangingPassword).toBeFalse();
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.PASSWORD_CHANGED});
  }));

  it('shows the translated API error and keeps the fields', fakeAsync(() => {
    authService.changePassword.and.returnValue(Promise.resolve({success: false, code: 'CURRENT_PASSWORD_INVALID'}));
    fillPasswords('wrongpassword', 'newpassword', 'newpassword');

    component.handleChangePassword();
    tick();

    expect(component.passwordError).toBe('ERRORS.AUTH.CURRENT_PASSWORD_INVALID');
    expect(component.currentPassword).toBe('wrongpassword');
    expect(toastService.show).not.toHaveBeenCalled();
  }));

  it('lets the user leave with typed passwords', () => {
    fillPasswords('oldpassword', 'newpassword', 'newpassword');

    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.confirmLeave()).toBeTrue();
  });
});
