import { describe, expect, it } from "vitest";
import { apply, findCard, markerCentresMm, rectifyWindow, type Point } from "@/lib/fabric/calibration";
import { photo } from "../fixtures/card-photo";

// Ar-Ge A1 (ARGE.md): a synthetic photo of fabric with the card on it, taken at an angle.
// The fabric has stripes 1 cm apart, so the scale of the flattened window can be measured.

/** Period along x of the flattened window, in pixels (autocorrelation of the column means). */
function periodX(p: { data: Uint8ClampedArray; width: number; height: number }): number {
  const { data, width: w, height: h } = p;
  const col = Array.from({ length: w }, (_, x) => {
    let s = 0;
    for (let y = 0; y < h; y++) s += data[(y * w + x) * 4];
    return s / h;
  });
  const mean = col.reduce((a, b) => a + b, 0) / w;
  const c = col.map((v) => v - mean);
  const at = (lag: number) => { let s = 0; for (let x = 0; x + lag < w; x++) s += c[x] * c[x + lag]; return s / (w - lag); };
  const ac = Array.from({ length: Math.floor(w / 3) }, (_, lag) => (lag < 5 ? -Infinity : at(lag)));
  const top = Math.max(...ac);
  // the first peak, not a multiple of it: a periodic signal peaks almost as high at 2×, 3× …
  let bestLag = 5;
  for (let lag = 6; lag < ac.length - 1; lag++) if (ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1] && ac[lag] > 0.7 * top) { bestLag = lag; break; }
  // parabolic refinement around the peak
  const y0 = at(bestLag - 1), y1 = at(bestLag), y2 = at(bestLag + 1);
  return bestLag + (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2);
}

describe("kalibrasyon kartı", () => {
  const cases: [string, Point[], boolean][] = [
    ["tepeden, hafif dönük", [[380, 120], [1020, 150], [990, 1000], [350, 975]], false],
    ["açılı (perspektif)", [[420, 140], [980, 110], [1080, 1020], [300, 990]], false],
    ["koyu kumaş, açılı", [[360, 160], [1010, 120], [1050, 1010], [330, 1040]], true],
  ];
  for (const [name, quad, dark] of cases)
    it(`${name}: işaretler bulunur, ölçek hatası %2'nin altında`, () => {
      const { px, H } = photo(quad, dark);
      const found = findCard(px);
      expect(found).not.toBeNull();
      const truth = markerCentresMm().map((p) => apply(H, p));
      for (let i = 0; i < 4; i++) expect(Math.hypot(found!.markers[i][0] - truth[i][0], found!.markers[i][1] - truth[i][1])).toBeLessThan(3);
      const { pixels, sizeCm } = rectifyWindow(px, found!);
      expect(sizeCm).toBeCloseTo(14.2, 5);
      const pxPerCm = pixels.width / sizeCm;
      const err = Math.abs(periodX(pixels) / pxPerCm - 1);
      const markerErr = Math.max(...truth.map((t, i) => Math.hypot(found!.markers[i][0] - t[0], found!.markers[i][1] - t[1])));
      if (process.env.ORMEN_OLC) console.info(`${name}: ölçek hatası %${(err * 100).toFixed(2)}, işaret hatası en çok ${markerErr.toFixed(2)} px, ${found!.pxPerMm.toFixed(2)} px/mm`);
      expect(err).toBeLessThan(0.02);
    });

  it("kart yoksa bulunmaz", () => {
    const { px } = photo([[-5000, -5000], [-4000, -5000], [-4000, -4000], [-5000, -4000]]);
    expect(findCard(px)).toBeNull();
  });
});
