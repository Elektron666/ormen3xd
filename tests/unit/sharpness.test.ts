import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { BLUR_RATIO, looksBlurred, sharpnessRatio } from "@/lib/fabric/sharpness";

// On a real catalogue photo (the threshold was set on these; scripts/olc-keskinlik.ts):
// as it is, it passes; blurred like a shaky or out-of-focus shot, it is flagged.
async function load(file: string, sigma = 0) {
  let img = sharp(file).ensureAlpha();
  if (sigma) img = img.blur(sigma);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

describe("bulanık fotoğraf uyarısı", () => {
  for (const code of ["misso-01", "misso-05", "siena-01"])
    it(`${code}: net hâli uyarı vermez, σ=3 bulanığı uyarı verir`, async () => {
      const file = `public/seed/fabrics/${code.split("-")[0]}/${code}-albedo-2k.webp`;
      const sharpPx = await load(file);
      expect(sharpnessRatio(sharpPx)).toBeGreaterThan(BLUR_RATIO);
      expect(looksBlurred(sharpPx)).toBe(false);
      expect(looksBlurred(await load(file, 3))).toBe(true);
    });
});
