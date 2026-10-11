// Ar-Ge A1 (ARGE.md): measures how often a pattern repeats in a flattened
// photo, to check the calibration card's scale against something of known size
// (graph paper's 1 cm grid, a striped fabric measured with a ruler).

import type { Pixels } from "./process";

/**
 * The pattern's period along `axis`, in pixels, from the autocorrelation of the
 * row or column means. With `expectedPx`, the strongest peak within ±40 % of it
 * (graph paper also repeats every millimetre); without, the first clear peak.
 * Null when there is no clear peak: no repeat, or fewer than two in the image.
 */
export function repeatPeriod(px: Pixels, axis: "x" | "y", expectedPx?: number): number | null {
  const { data, width: w, height: h } = px;
  const n = axis === "x" ? w : h;
  const m = axis === "x" ? h : w;
  const line = Array.from({ length: n }, (_, i) => {
    let s = 0;
    for (let j = 0; j < m; j++) {
      const o = (axis === "x" ? j * w + i : i * w + j) * 4;
      s += 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    }
    return s / m;
  });
  const mean = line.reduce((a, b) => a + b, 0) / n;
  const c = line.map((v) => v - mean);
  const at = (lag: number) => {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += c[i] * c[i + lag];
    return s / (n - lag);
  };
  // flat along this axis (stripes running the other way): nothing to measure
  if (Math.sqrt(at(0)) < 2) return null;
  const maxLag = Math.floor(n / 2);
  const ac = Array.from({ length: maxLag + 1 }, (_, lag) => (lag < 3 ? -Infinity : at(lag)));
  // a weak peak is noise or grain, not a repeat: it must carry a fair share of the variance
  const floor = 0.25 * at(0);
  const isPeak = (lag: number) => lag > 3 && lag < maxLag && ac[lag] > floor && ac[lag] >= ac[lag - 1] && ac[lag] >= ac[lag + 1];
  let best = -1;
  if (expectedPx) {
    for (let lag = Math.max(4, Math.floor(expectedPx * 0.6)); lag <= Math.min(maxLag - 1, Math.ceil(expectedPx * 1.4)); lag++)
      if (isPeak(lag) && (best < 0 || ac[lag] > ac[best])) best = lag;
  } else {
    const top = Math.max(...ac.slice(4, maxLag));
    // the first peak, not a multiple of it: a periodic signal peaks almost as high at 2×, 3× …
    for (let lag = 4; lag < maxLag; lag++)
      if (isPeak(lag) && ac[lag] > 0.7 * top) {
        best = lag;
        break;
      }
  }
  if (best < 0) return null;
  // parabolic refinement around the peak
  const y0 = ac[best - 1], y1 = ac[best], y2 = ac[best + 1];
  const d = y0 - 2 * y1 + y2;
  return d === 0 ? best : best + (0.5 * (y0 - y2)) / d;
}
