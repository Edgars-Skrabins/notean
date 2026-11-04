import {colorStops, composite, contrastRatio, parseColor, Rgba} from "./contrast";

describe('contrast helpers', () => {
  const white = parseColor('#ffffff') as Rgba;
  const black = parseColor('#000000') as Rgba;

  it('measures black on white as 21:1', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 2);
  });

  it('measures #777777 on white as 4.48:1', () => {
    expect(contrastRatio(parseColor('#777777') as Rgba, white)).toBeCloseTo(4.48, 2);
  });

  it('composites half-transparent black on white to #808080', () => {
    const result = composite(parseColor('rgba(0, 0, 0, 0.5)') as Rgba, white);

    expect(result).toEqual(parseColor('#808080') as Rgba);
    expect(contrastRatio(result, white)).toBeCloseTo(3.95, 2);
  });

  it('returns the colour stops of a gradient', () => {
    expect(colorStops('radial-gradient(circle at 20% 20%, #1b1042 0%, #07040f 100%)')).toEqual([
      parseColor('#1b1042') as Rgba,
      parseColor('#07040f') as Rgba,
    ]);
  });

  it('returns a single translucent colour', () => {
    expect(colorStops('rgba(255, 255, 255, 0.06)')).toEqual([{r: 255, g: 255, b: 255, a: 0.06}]);
  });

  it('expands short hex colours', () => {
    expect(parseColor('#abc')).toEqual(parseColor('#aabbcc'));
  });

  it('reads transparent and rejects unknown values', () => {
    expect(parseColor('transparent')).toEqual({r: 0, g: 0, b: 0, a: 0});
    expect(parseColor('var(--x)')).toBeNull();
  });
});
