import {AxiosError} from "axios";
import {AvatarService, mapAvatar} from "./avatar.service";
import {axiosInstance} from "@config/axiosConfig";

describe('mapAvatar', () => {
  it('maps snake_case fields to camelCase', () => {
    expect(mapAvatar({color: 'blue', image_url: '/rails/active_storage/blobs/redirect/abc/a.png'}))
      .toEqual({color: 'blue', imageUrl: '/rails/active_storage/blobs/redirect/abc/a.png'});
  });
});

describe('AvatarService', () => {
  it('starts with no avatar and requests nothing on construction', () => {
    const get = spyOn(axiosInstance, 'get');

    const service = new AvatarService();

    expect(service.getAvatar()).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('set stores the given avatar', () => {
    const service = new AvatarService();

    service.set({color: 'pink', imageUrl: null});

    expect(service.getAvatar()).toEqual({color: 'pink', imageUrl: null});
  });

  it('update sends the colour, image and remove flag as form data', async () => {
    const patch = spyOn(axiosInstance, 'patch').and.returnValue(Promise.resolve({data: {avatar: {color: 'cyan', image_url: '/img'}}}));
    const service = new AvatarService();
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
    const service = new AvatarService();

    await service.update({color: 'red'});

    const formData = patch.calls.mostRecent().args[1] as FormData;
    expect(formData.has('avatar[image]')).toBeFalse();
    expect(formData.has('avatar[remove_image]')).toBeFalse();
  });

  it('update keeps the previous avatar on failure', async () => {
    spyOn(axiosInstance, 'patch').and.returnValue(Promise.reject(new AxiosError('failed')));
    const service = new AvatarService();
    service.set({color: 'pink', imageUrl: null});

    const response = await service.update({color: 'red'});

    expect(response.success).toBeFalse();
    expect(service.getAvatar()).toEqual({color: 'pink', imageUrl: null});
  });

  it('clear removes the avatar', () => {
    const service = new AvatarService();
    service.set({color: 'pink', imageUrl: null});

    service.clear();

    expect(service.getAvatar()).toBeNull();
  });
});
