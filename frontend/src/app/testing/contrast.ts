export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\btransparent\b/g;

export function parseColor(value: string): Rgba | null {
  const text = value.trim();
  if (text === 'transparent') {
    return {r: 0, g: 0, b: 0, a: 0};
  }
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].split('').map((digit) => digit + digit).join('') : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

export function colorStops(value: string): Rgba[] {
  return (value.match(COLOR_PATTERN) ?? [])
    .map((match) => parseColor(match))
    .filter((color): color is Rgba => color !== null);
}

export function composite(foreground: Rgba, background: Rgba): Rgba {
  const mix = (front: number, back: number) => Math.round(front * foreground.a + back * (1 - foreground.a));
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

export function relativeLuminance(color: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function worstContrast(foreground: Rgba, backgrounds: Rgba[]): number {
  return Math.min(...backgrounds.map((background) => contrastRatio(foreground, background)));
}
