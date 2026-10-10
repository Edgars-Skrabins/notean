import {AvatarColor} from "@config/avatarColors";

export interface Avatar {
  color: AvatarColor;
  imageUrl: string | null;
}

export interface AvatarUpdate {
  color?: AvatarColor;
  image?: File;
  removeImage?: boolean;
}

export type AvatarResponse =
  | { success: true; avatar: Avatar }
  | { success: false; statusMessage: string };
