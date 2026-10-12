// Is the fabric photo in focus? (gece toplantısı, 12 Oct; Hakan: in the depot a blurred
// shot slips through.) Plain fabrics have little detail even when sharp, so the size of
// the detail alone says little. What blur takes away is the finest detail relative to the
// coarser one: the Laplacian's energy at full size over its energy at half size. A sharp
// photo keeps that ratio up whatever the fabric; a blurred one loses it.

import type { Pixels } from "./process";

function grey(px: Pixels): Float32Array {
  const { data, width: w, height: h } = px;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return g;
}

function half(g: Float32Array, w: number, h: number): { g: Float32Array; w: number; h: number } {
  const w2 = w >> 1;
  const h2 = h >> 1;
  const out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      const i = 2 * y * w + 2 * x;
      out[y * w2 + x] = (g[i] + g[i + 1] + g[i + w] + g[i + w + 1]) / 4;
    }
  return { g: out, w: w2, h: h2 };
}

/** Mean squared Laplacian, a 4-neighbour kernel, borders left out. */
function laplacianEnergy(g: Float32Array, w: number, h: number): number {
  let s = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      s += l * l;
      n++;
    }
  return n ? s / n : 0;
}

/**
 * Fine detail over coarse detail, about 0.25–0.6 for a photo in focus (higher for
 * noisy ones), lower the more it is blurred. Measured on the central square, at
 * most 1024 px, so the photo's own size does not move it.
 */
export function sharpnessRatio(px: Pixels): number {
  let g = grey(px);
  let w = px.width;
  let h = px.height;
  while (Math.max(w, h) > 1024) ({ g, w, h } = half(g, w, h));
  const fine = laplacianEnergy(g, w, h);
  const coarse = half(g, w, h);
  const c = laplacianEnergy(coarse.g, coarse.w, coarse.h);
  return c > 1e-6 ? fine / c : 0;
}

/**
 * Below this the photo is treated as blurred. On the 30 catalogue photos (ARGE.md) the
 * sharp ones all stay above 0.156; strong blur (σ = 3 px) falls under it on half of them.
 * Plain fabrics with almost no fine detail are not caught: a warning, never a block.
 */
export const BLUR_RATIO = 0.12;

export function looksBlurred(px: Pixels): boolean {
  return sharpnessRatio(px) < BLUR_RATIO;
}
