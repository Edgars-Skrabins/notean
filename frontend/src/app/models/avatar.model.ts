import {Result} from "@models/result.model";
import {UsersErrorCode} from "@config/errorCodes";
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

export type AvatarResponse = Result<{ avatar: Avatar }, UsersErrorCode>;
