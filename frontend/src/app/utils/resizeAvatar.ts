import {AVATAR_IMAGE_SIZE} from "@config/avatarColors";

const AVATAR_IMAGE_TYPE = 'image/webp';
const AVATAR_IMAGE_QUALITY = 0.85;
const AVATAR_FILE_NAME = 'avatar.webp';

export async function resizeAvatar(file: File): Promise<File | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - side) / 2;
  const sourceY = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_IMAGE_SIZE;
  canvas.height = AVATAR_IMAGE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return null;
  }
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, AVATAR_IMAGE_SIZE, AVATAR_IMAGE_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, AVATAR_IMAGE_TYPE, AVATAR_IMAGE_QUALITY));
  if (!blob) {
    return null;
  }
  return new File([blob], AVATAR_FILE_NAME, {type: AVATAR_IMAGE_TYPE});
}
