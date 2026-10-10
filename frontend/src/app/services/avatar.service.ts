import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {axiosInstance} from "@config/axiosConfig";
import {AvatarColor} from "@config/avatarColors";
import {apiRequest} from "@utils/apiRequest";
import {AuthService} from "@services/auth.service";
import {Avatar, AvatarResponse, AvatarUpdate} from "@models/avatar.model";

export interface RawAvatar {
  color: AvatarColor;
  image_url: string | null;
}

export function mapAvatar(raw: RawAvatar): Avatar {
  return {
    color: raw.color,
    imageUrl: raw.image_url,
  };
}

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private avatarUrl = '/users/me/avatar';
  private avatarSubject = new BehaviorSubject<Avatar | null>(null);

  readonly avatar$: Observable<Avatar | null> = this.avatarSubject.asObservable();

  constructor(private authService: AuthService) {
    if (this.authService.isAuthenticated()) {
      this.load();
    }
  }

  getAvatar(): Avatar | null {
    return this.avatarSubject.value;
  }

  async load(): Promise<AvatarResponse> {
    return apiRequest<AvatarResponse>(
      axiosInstance.get(this.avatarUrl),
      (data) => {
        const avatar = mapAvatar(data.avatar);
        this.avatarSubject.next(avatar);
        return {success: true, avatar};
      },
    );
  }

  async update(update: AvatarUpdate): Promise<AvatarResponse> {
    const formData = new FormData();
    if (update.color) {
      formData.append('avatar[color]', update.color);
    }
    if (update.image) {
      formData.append('avatar[image]', update.image);
    }
    if (update.removeImage) {
      formData.append('avatar[remove_image]', 'true');
    }

    return apiRequest<AvatarResponse>(
      axiosInstance.patch(this.avatarUrl, formData),
      (data) => {
        const avatar = mapAvatar(data.avatar);
        this.avatarSubject.next(avatar);
        return {success: true, avatar};
      },
    );
  }

  clear() {
    this.avatarSubject.next(null);
  }
}
