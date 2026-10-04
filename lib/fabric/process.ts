// Turning one fabric photo into a texture set. Pure functions on RGBA pixel
// arrays so they run in the browser (panel) and in tests alike.

import type { ColorFamily, FabricType } from "@/lib/types";
import { COLOR_FAMILY_SWATCH } from "@/lib/i18n/tr";
import { blurWrap, heightToNormal, linearToSrgb, normalize01, rgbToHex, srgbToLinear } from "./maps";
import { deltaE2000, hexToLab } from "./color";

export interface Pixels {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
}

const lum = (r: number, g: number, b: number) => 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);

/** Mean colour in linear light, as sRGB hex. */
export function averageColor({ data }: Pixels): string {
  const sum = [0, 0, 0];
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += srgbToLinear(data[i + c] / 255);
  return rgbToHex(sum.map((v) => linearToSrgb(v / n)) as [number, number, number]);
}

/** Closest colour family to a colour (for the panel's suggestion). */
export function suggestColorFamily(hex: string): ColorFamily {
  const lab = hexToLab(hex);
  let best: ColorFamily = "gri";
  let bestD = Infinity;
  for (const [family, swatch] of Object.entries(COLOR_FAMILY_SWATCH) as [ColorFamily, string][]) {
    const d = deltaE2000(lab, hexToLab(swatch));
    if (d < bestD) {
      bestD = d;
      best = family;
    }
  }
  return best;
}

/**
 * How badly the image breaks where it repeats: colour jump across the
 * wrap-around edges divided by the typical jump between neighbouring pixels.
 * ~1 is seamless; above SEAM_LIMIT the repeat will show as a line.
 */
export function seamScore({ data, width: w, height: h }: Pixels): number {
  const px = (x: number, y: number, c: number) => data[(y * w + x) * 4 + c];
  const diff = (x1: number, y1: number, x2: number, y2: number) =>
    (Math.abs(px(x1, y1, 0) - px(x2, y2, 0)) + Math.abs(px(x1, y1, 1) - px(x2, y2, 1)) + Math.abs(px(x1, y1, 2) - px(x2, y2, 2))) / 3;
  let edge = 0, edgeN = 0, inner = 0, innerN = 0;
  for (let y = 0; y < h; y++) {
    edge += diff(w - 1, y, 0, y);
    edgeN++;
    const x = (y * 7919) % (w - 1); // a spread of interior columns
    inner += diff(x, y, x + 1, y);
    innerN++;
  }
  for (let x = 0; x < w; x++) {
    edge += diff(x, h - 1, x, 0);
    edgeN++;
    const y = (x * 104729) % (h - 1);
    inner += diff(x, y, x, y + 1);
    innerN++;
  }
  return edge / edgeN / Math.max(1, inner / innerN);
}

export const SEAM_LIMIT = 2.2;

/**
 * Makes a photo tile without a visible line: blends it with a copy shifted
 * by half its size (whose edges are the photo's continuous centre), using a
 * mask that hands the edges over to the shifted copy.
 */
export function makeSeamless({ data, width: w, height: h }: Pixels, band = 0.18): Pixels {
  const out = new Uint8ClampedArray(data.length);
  const ramp = (t: number) => {
    const d = Math.min(t, 1 - t); // distance to the nearest edge, 0..0.5
    const k = Math.min(1, d / band);
    return k * k * (3 - 2 * k);
  };
  for (let y = 0; y < h; y++) {
    const my = ramp((y + 0.5) / h);
    const sy = (y + (h >> 1)) % h;
    for (let x = 0; x < w; x++) {
      const m = Math.min(ramp((x + 0.5) / w), my);
      const sx = (x + (w >> 1)) % w;
      const i = (y * w + x) * 4;
      const j = (sy * w + sx) * 4;
      for (let c = 0; c < 3; c++) out[i + c] = data[i + c] * m + data[j + c] * (1 - m);
      out[i + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

/** Relief strength used when estimating height from a colour photo. */
const RELIEF: Record<FabricType, number> = {
  bukle: 1.4,
  dokuma: 1,
  nubuk: 0.35,
  kadife: 0.25,
  sonil: 0.7,
  "keten-gorunumlu": 0.9,
  jakar: 0.8,
};

export interface DerivedMaps {
  normal: Uint8ClampedArray; // RGBA
  roughness: Uint8ClampedArray; // RGBA greyscale
}

/**
 * Estimates relief from a colour photo (bright = raised, after removing the
 * large-scale lighting) and derives a normal and a roughness map. Quality is
 * limited compared with a measured normal map; good enough to make the weave
 * catch the light.
 */
export function deriveMaps({ data, width: w, height: h }: Pixels, type: FabricType, repeatWidthCm: number): DerivedMaps {
  const n = w * h;
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  // remove uneven lighting: subtract a wide blur (about 1.5 cm)
  const pxPerCm = w / repeatWidthCm;
  const wide = blurWrap(L, w, Math.max(2, Math.round(pxPerCm * 1.5)), h);
  const fine = blurWrap(L, w, 1, h);
  const hp = new Float32Array(n);
  for (let i = 0; i < n; i++) hp[i] = fine[i] - wide[i];
  const height = normalize01(hp);

  const mmPerPx = (repeatWidthCm * 10) / w;
  const normal3 = heightToNormal(height, w, (RELIEF[type] * 0.5) / (8 * mmPerPx), h);
  const normal = new Uint8ClampedArray(n * 4);
  const roughness = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    normal[i * 4] = normal3[i * 3];
    normal[i * 4 + 1] = normal3[i * 3 + 1];
    normal[i * 4 + 2] = normal3[i * 3 + 2];
    normal[i * 4 + 3] = 255;
    // raised fibres catch more light → slightly smoother; valleys rougher
    const r = Math.round(Math.min(1, Math.max(0, 0.9 - 0.12 * (height[i] - 0.5))) * 255);
    roughness[i * 4] = roughness[i * 4 + 1] = roughness[i * 4 + 2] = r;
    roughness[i * 4 + 3] = 255;
  }
  return { normal, roughness };
}
