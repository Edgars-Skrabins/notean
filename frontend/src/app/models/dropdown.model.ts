import {PriorityColor} from "@models/priority.model";

export interface DropdownOption {
  value: string | number | null;
  label?: string;
  labelKey?: string;
  prefix?: string;
  color?: PriorityColor;
}
