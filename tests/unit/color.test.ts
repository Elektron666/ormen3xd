import { describe, expect, it } from "vitest";
import { colourDrift, deltaE2000, hexToLab, type Lab } from "@/lib/fabric/color";

describe("CIEDE2000", () => {
  // reference pairs from Sharma, Wu & Dalal (2005)
  const pairs: [Lab, Lab, number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  ];
  it.each(pairs)("matches the published value %#", (a, b, expected) => {
    expect(deltaE2000(a, b)).toBeCloseTo(expected, 3);
  });

  it("is zero for identical colours and grows with distance", () => {
    expect(deltaE2000(hexToLab("#C9B597"), hexToLab("#C9B597"))).toBeCloseTo(0, 10);
    expect(deltaE2000(hexToLab("#C9B597"), hexToLab("#2F3A50"))).toBeGreaterThan(30);
  });

  it("separates lightness change from colour shift", () => {
    const ref = hexToLab("#A3583A");
    const darker = hexToLab("#8A4A31"); // same hue, darker
    const d = colourDrift(ref, darker);
    expect(d.deltaL).toBeLessThan(0);
    expect(d.chromaHue).toBeLessThan(d.deltaE);
  });
});
