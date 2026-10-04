import { describe, expect, it } from "vitest";
import { averageColor, deriveMaps, makeSeamless, seamScore, SEAM_LIMIT, suggestColorFamily, type Pixels } from "@/lib/fabric/process";

function image(w: number, h: number, f: (x: number, y: number) => [number, number, number]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  return { data, width: w, height: h };
}

// a tileable weave-like pattern
const tiling = image(64, 48, (x, y) => {
  const v = 128 + 60 * Math.sin((x / 64) * Math.PI * 8) * Math.cos((y / 48) * Math.PI * 6);
  return [v, v * 0.9, v * 0.7];
});
// a photo with a lighting gradient: left dark, right bright → visible seam when tiled
const gradient = image(64, 48, (x, y) => {
  const v = 60 + x * 2.5 + 20 * Math.sin(y);
  return [v, v, v];
});

describe("seam detection", () => {
  it("passes a tileable texture", () => expect(seamScore(tiling)).toBeLessThan(SEAM_LIMIT));
  it("flags a photo whose edges do not meet", () => expect(seamScore(gradient)).toBeGreaterThan(SEAM_LIMIT));
  it("fixes it with edge blending", () => expect(seamScore(makeSeamless(gradient))).toBeLessThan(SEAM_LIMIT));
});

describe("colour", () => {
  it("averages in linear light", () => {
    const half = image(2, 1, (x) => (x === 0 ? [0, 0, 0] : [255, 255, 255]));
    // linear mean 0.5 → sRGB ≈ 188 (#BC)
    expect(averageColor(half)).toBe("#BCBCBC");
  });
  it("suggests a sensible colour family", () => {
    expect(suggestColorFamily("#2F3A50")).toBe("mavi");
    expect(suggestColorFamily("#E6DFD1")).toBe("beyaz-krem");
    expect(suggestColorFamily("#6B6A45")).toBe("yesil");
  });
});

describe("derived maps", () => {
  it("makes a normal map that tilts with the pattern and a roughness map in range", () => {
    const { normal, roughness } = deriveMaps(tiling, "dokuma", 8);
    expect(normal.length).toBe(64 * 48 * 4);
    let tilted = 0;
    for (let i = 0; i < 64 * 48; i++) if (Math.abs(normal[i * 4] - 128) > 4) tilted++;
    expect(tilted).toBeGreaterThan(64 * 48 * 0.2);
    for (let i = 0; i < roughness.length; i += 4) {
      expect(roughness[i]).toBeGreaterThan(150);
      expect(roughness[i]).toBeLessThan(255);
    }
  });
  it("keeps a flat photo flat", () => {
    const flat = image(16, 16, () => [120, 110, 100]);
    const { normal } = deriveMaps(flat, "nubuk", 10);
    expect([normal[0], normal[1], normal[2]]).toEqual([128, 128, 255]);
  });
});
