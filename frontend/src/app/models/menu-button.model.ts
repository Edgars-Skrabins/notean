import {Avatar} from "@models/avatar.model";

export interface MenuButtonOption {
  value: string | number | null;
  label?: string;
  labelKey?: string;
  avatar?: Avatar;
}
