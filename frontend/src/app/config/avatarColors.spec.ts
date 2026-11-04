import {AVATAR_COLORS} from "./avatarColors";
import {contrastRatio, parseColor, Rgba} from "../testing/contrast";

describe('avatar colours', () => {
  for (const option of AVATAR_COLORS) {
    it(`${option.key} letters reach 4.5:1 on their background`, () => {
      const ratio = contrastRatio(parseColor(option.textColor) as Rgba, parseColor(option.hex) as Rgba);

      expect(ratio).withContext(`${option.key} ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
