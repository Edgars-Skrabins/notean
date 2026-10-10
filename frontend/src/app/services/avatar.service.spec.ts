import {AxiosError} from "axios";
import {AvatarService, mapAvatar} from "./avatar.service";
import {axiosInstance} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";

describe('mapAvatar', () => {
  it('maps snake_case fields to camelCase', () => {
    expect(mapAvatar({color: 'blue', image_url: '/rails/active_storage/blobs/redirect/abc/a.png'}))
      .toEqual({color: 'blue', imageUrl: '/rails/active_storage/blobs/redirect/abc/a.png'});
  });
});

describe('AvatarService', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    authService.isAuthenticated.and.returnValue(false);
  });

  it('starts with no avatar', () => {
    const service = new AvatarService(authService);

    expect(service.getAvatar()).toBeNull();
  });

  it('loads on construction when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    const get = spyOn(axiosInstance, 'get').and.returnValue(new Promise(() => undefined));

    new AvatarService(authService);

    expect(get).toHaveBeenCalledWith('/users/me/avatar');
  });

  it('does not load on construction when logged out', () => {
    const get = spyOn(axiosInstance, 'get');

    new AvatarService(authService);

    expect(get).not.toHaveBeenCalled();
  });

  it('load maps and stores the avatar', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {avatar: {color: 'pink', image_url: null}}}));
    const service = new AvatarService(authService);

    await service.load();

    expect(service.getAvatar()).toEqual({color: 'pink', imageUrl: null});
  });

  it('update sends the colour, image and remove flag as form data', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {avatar: {color: 'cyan', image_url: '/img'}}}));
    const service = new AvatarService(authService);
    const image = new File(['x'], 'avatar.png', {type: 'image/png'});

    const response = await service.update({color: 'cyan', image, removeImage: true});

    const [url, formData] = patch.calls.mostRecent().args as [string, FormData];
    expect(url).toBe('/users/me/avatar');
    expect(formData.get('avatar[color]')).toBe('cyan');
    expect(formData.get('avatar[image]')).toEqual(image);
    expect(formData.get('avatar[remove_image]')).toBe('true');
    expect(response.success).toBeTrue();
    expect(service.getAvatar()).toEqual({color: 'cyan', imageUrl: '/img'});
  });

  it('update leaves out fields that are not changing', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {avatar: {color: 'red', image_url: null}}}));
    const service = new AvatarService(authService);

    await service.update({color: 'red'});

    const formData = patch.calls.mostRecent().args[1] as FormData;
    expect(formData.has('avatar[image]')).toBeFalse();
    expect(formData.has('avatar[remove_image]')).toBeFalse();
  });

  it('update keeps the previous avatar on failure', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {avatar: {color: 'pink', image_url: null}}}));
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));
    const service = new AvatarService(authService);
    await service.load();

    const response = await service.update({color: 'red'});

    expect(response.success).toBeFalse();
    expect(service.getAvatar()).toEqual({color: 'pink', imageUrl: null});
  });

  it('clear removes the avatar', async () => {
    spyOn(axiosInstance, 'get').and.returnValue(Promise.resolve({data: {avatar: {color: 'pink', image_url: null}}}));
    const service = new AvatarService(authService);
    await service.load();

    service.clear();

    expect(service.getAvatar()).toBeNull();
  });
});
