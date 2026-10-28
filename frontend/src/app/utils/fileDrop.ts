import {IMAGE_TYPES} from "@config/attachmentLimits";

export function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

export function droppedFiles(event: DragEvent): File[] {
  return Array.from(event.dataTransfer?.files ?? []);
}

export function pastedFiles(event: ClipboardEvent): File[] {
  return Array.from(event.clipboardData?.files ?? []);
}

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}
