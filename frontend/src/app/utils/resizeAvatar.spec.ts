import {resizeAvatar} from "./resizeAvatar";

function widePng(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 100;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#0000ff';
  context.fillRect(0, 0, 300, 100);
  context.fillStyle = '#ff0000';
  context.fillRect(100, 0, 100, 100);
  return new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob!], 'wide.png', {type: 'image/png'})), 'image/png'));
}

async function cornerPixel(file: File): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(2, 2, 1, 1).data;
}

describe('resizeAvatar', () => {
  it('turns a non-square image into a 128x128 WebP file', async () => {
    const result = await resizeAvatar(await widePng());

    expect(result).not.toBeNull();
    expect(result!.type).toBe('image/webp');
    expect(result!.name).toBe('avatar.webp');
    const bitmap = await createImageBitmap(result!);
    expect(bitmap.width).toBe(128);
    expect(bitmap.height).toBe(128);
  });

  it('crops the center of the image', async () => {
    const result = await resizeAvatar(await widePng());

    const [red, green, blue] = await cornerPixel(result!);
    expect(red).toBeGreaterThan(200);
    expect(green).toBeLessThan(50);
    expect(blue).toBeLessThan(50);
  });

  it('returns null for a file that is not an image', async () => {
    const result = await resizeAvatar(new File(['not an image'], 'a.png', {type: 'image/png'}));

    expect(result).toBeNull();
  });
});
