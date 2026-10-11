// Ar-Ge A1 (ARGE.md): the ORMEN calibration card. An A4 sheet with a square
// window cut out of its middle and a marker at each corner of the window. Laid
// on the fabric and photographed from above, it gives the photo its exact
// scale and undoes the perspective: the four markers are found, a homography
// maps the card (in millimetres) onto the photo, and the fabric inside the
// window is resampled flat at a known number of pixels per centimetre.
// Pure computation on RGBA pixels: runs in the browser and in tests.

import type { Pixels } from "./process";

/** The card, in millimetres from its top-left corner (portrait A4). */
export const CARD = {
  width: 210,
  height: 297,
  /** The cut-out: the fabric shows through here. */
  window: { x: 30, y: 40, size: 150 },
  /** Black squares with a white centre, beside each corner of the window. */
  marker: { size: 18, hole: 6, offset: 14 },
  /** A printed bar that must measure exactly this long: checks the printer did not scale the page. */
  checkBarMm: 100,
} as const;

/** Taken off each side of the window when flattening it, so no paper edge shows. */
export const WINDOW_INSET_MM = 4;
/** Side of the flattened fabric square, cm. */
export const CARD_FABRIC_CM = (CARD.window.size - 2 * WINDOW_INSET_MM) / 10;

/** Marker centres on the card, clockwise from top-left. */
export function markerCentresMm(): [number, number][] {
  const { x, y, size } = CARD.window;
  const o = CARD.marker.offset;
  return [
    [x - o, y - o],
    [x + size + o, y - o],
    [x + size + o, y + size + o],
    [x - o, y + size + o],
  ];
}

export type Point = [number, number];

// ------------------------------------------------------------------ homography

/** The 3×3 matrix (row-major, h33 = 1) taking each `from` point to its `to` point. */
export function homography(from: Point[], to: Point[]): number[] {
  // 8 unknowns, 2 equations per correspondence (direct linear transform)
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i];
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    if (Math.abs(A[c][c]) < 1e-12) throw new Error("tekil homografi");
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * h[k];
    h[r] = s / A[r][r];
  }
  return [...h, 1];
}

export function apply(H: number[], [x, y]: Point): Point {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

// ------------------------------------------------------------------ marker detection

const lum = (d: Uint8ClampedArray | Uint8Array, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Otsu's threshold on a grey histogram. */
function otsu(grey: Float32Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of grey) hist[Math.max(0, Math.min(255, Math.round(v)))]++;
  const total = grey.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let t = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      t = i;
    }
  }
  return t;
}

interface Blob {
  area: number;
  cx: number;
  cy: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Dark, roughly square blobs with a light centre: candidate markers. A fabric
 * seen through the window can be dark too, but its blobs rarely have the
 * marker's filled-ring shape with a hole exactly at the centre.
 */
function candidates(px: Pixels): Blob[] {
  const { data, width: w, height: h } = px;
  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) grey[i] = lum(data, i * 4);
  const t = otsu(grey);
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) dark[i] = grey[i] < t ? 1 : 0;
  const label = new Int32Array(w * h).fill(-1);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || label[s] !== -1) continue;
    const id = blobs.length;
    const b: Blob = { area: 0, cx: 0, cy: 0, x0: w, y0: h, x1: 0, y1: 0 };
    label[s] = id;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      b.area++;
      b.cx += x;
      b.cy += y;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (dark[j] && label[j] === -1) {
            label[j] = id;
            stack.push(j);
          }
        }
    }
    b.cx /= b.area;
    b.cy /= b.area;
    blobs.push(b);
  }
  const minArea = w * h * 0.00015;
  return blobs.filter((b) => {
    const bw = b.x1 - b.x0 + 1;
    const bh = b.y1 - b.y0 + 1;
    if (b.area < minArea || bw < 8 || bh < 8) return false;
    const aspect = bw / bh;
    if (aspect < 0.5 || aspect > 2) return false;
    const fill = b.area / (bw * bh);
    if (fill < 0.45 || fill > 0.97) return false;
    // the hole: light at the centre, dark a little way out towards the edges
    const at = (x: number, y: number) => grey[Math.round(y) * w + Math.round(x)];
    return at(b.cx, b.cy) >= t && at(b.cx - bw * 0.38, b.cy) < t && at(b.cx + bw * 0.38, b.cy) < t;
  });
}

/** Four blobs as a convex quadrilateral, clockwise from top-left (image coordinates, y down). */
function order(q: Blob[]): Point[] {
  const mx = q.reduce((s, b) => s + b.cx, 0) / 4;
  const my = q.reduce((s, b) => s + b.cy, 0) / 4;
  const pts = q.map((b) => [b.cx, b.cy] as Point).sort((a, b) => Math.atan2(a[1] - my, a[0] - mx) - Math.atan2(b[1] - my, b[0] - mx));
  // atan2 order starts at the left; rotate so the point with the smallest x+y comes first
  let k = 0;
  for (let i = 1; i < 4; i++) if (pts[i][0] + pts[i][1] < pts[k][0] + pts[k][1]) k = i;
  return [...pts.slice(k), ...pts.slice(0, k)];
}

export interface CardFound {
  /** Marker centres in the photo, clockwise from top-left. */
  markers: Point[];
  /** Card millimetres → photo pixels. */
  H: number[];
  /** Photo pixels per millimetre at the window (mean). */
  pxPerMm: number;
}

/** Finds the card in a photo, or null. */
export function findCard(px: Pixels): CardFound | null {
  const c = candidates(px)
    .sort((a, b) => b.area - a.area)
    .slice(0, 12);
  if (c.length < 4) return null;
  const card = markerCentresMm();
  const side = CARD.window.size + 2 * CARD.marker.offset;
  let best: { score: number; q: Blob[] } | null = null;
  for (let a = 0; a < c.length; a++)
    for (let b = a + 1; b < c.length; b++)
      for (let d = b + 1; d < c.length; d++)
        for (let e = d + 1; e < c.length; e++) {
          const q = [c[a], c[b], c[d], c[e]];
          const areas = q.map((x) => x.area);
          const areaSpread = Math.max(...areas) / Math.min(...areas);
          if (areaSpread > 3) continue;
          const p = order(q);
          const sides = p.map((pt, i) => Math.hypot(p[(i + 1) % 4][0] - pt[0], p[(i + 1) % 4][1] - pt[1]));
          const sideSpread = Math.max(...sides) / Math.min(...sides);
          if (sideSpread > 2.5) continue;
          // markers are small next to the square they span
          const markerSide = Math.sqrt(Math.max(...areas));
          const ratio = Math.min(...sides) / markerSide;
          const expected = side / CARD.marker.size;
          if (ratio < expected * 0.4 || ratio > expected * 2.5) continue;
          const score = areaSpread + sideSpread;
          if (!best || score < best.score) best = { score, q };
        }
  if (!best) return null;
  const markers = order(best.q);
  const H = homography(card, markers);
  const sides = markers.map((pt, i) => Math.hypot(markers[(i + 1) % 4][0] - pt[0], markers[(i + 1) % 4][1] - pt[1]));
  const pxPerMm = sides.reduce((s, v) => s + v, 0) / 4 / side;
  return { markers, H, pxPerMm };
}

/**
 * The fabric inside the window, flat and square, at `pxPerCm` (default: the
 * photo's own resolution there, so nothing is invented), a little inset from
 * the cut edge so no paper shows.
 */
export function rectifyWindow(px: Pixels, found: CardFound, opts: { insetMm?: number; pxPerCm?: number; maxSide?: number } = {}): { pixels: Pixels; sizeCm: number } {
  const inset = opts.insetMm ?? WINDOW_INSET_MM;
  const sizeMm = CARD.window.size - 2 * inset;
  const ppmm = Math.min((opts.pxPerCm ?? found.pxPerMm * 10) / 10, (opts.maxSide ?? 2048) / sizeMm);
  const n = Math.max(8, Math.round(sizeMm * ppmm));
  const out = new Uint8ClampedArray(n * n * 4);
  const { data, width: w, height: h } = px;
  const x0 = CARD.window.x + inset;
  const y0 = CARD.window.y + inset;
  for (let v = 0; v < n; v++)
    for (let u = 0; u < n; u++) {
      const [sx, sy] = apply(found.H, [x0 + ((u + 0.5) * sizeMm) / n, y0 + ((v + 0.5) * sizeMm) / n]);
      // bilinear
      const fx = Math.max(0, Math.min(w - 1.001, sx - 0.5));
      const fy = Math.max(0, Math.min(h - 1.001, sy - 0.5));
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const tx = fx - ix;
      const ty = fy - iy;
      const o = (v * n + u) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = data[(iy * w + ix) * 4 + c];
        const p10 = data[(iy * w + ix + 1) * 4 + c];
        const p01 = data[((iy + 1) * w + ix) * 4 + c];
        const p11 = data[((iy + 1) * w + ix + 1) * 4 + c];
        out[o + c] = (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty;
      }
    }
  return { pixels: { data: out, width: n, height: n }, sizeCm: sizeMm / 10 };
}

// ------------------------------------------------------------------ white balance (Ar-Ge A2)

/**
 * Bare paper on the card, in millimetres: strips beside and below the window,
 * clear of the markers, the text and the check bar. The paper's own white is
 * the reference: a printed grey would carry the printer's ink tint with it.
 */
export const PAPER_STRIPS_MM = [
  { x0: 8, x1: 22, y0: 50, y1: 180 },
  { x0: 188, x1: 202, y0: 50, y1: 180 },
  { x0: 40, x1: 170, y0: 218, y1: 230 },
] as const;

export interface PaperWhite {
  /** The paper's colour in the photo (median of the brighter samples). */
  rgb: [number, number, number];
  /** Per-channel multipliers that bring the paper to `PAPER_TARGET` on every channel. */
  gains: [number, number, number];
  /** True when the paper is blown out and its colour cannot be read: no correction then. */
  clipped: boolean;
}

/**
 * The paper's value after correction. Neutral fixes the light's colour; one
 * fixed level also evens out exposure, so two photos of the same fabric come
 * out alike. A little under 255 leaves room for sheen.
 */
export const PAPER_TARGET = 235;

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s[s.length >> 1];
};

/** Reads the card's paper colour around the window. */
export function paperWhite(px: Pixels, found: CardFound): PaperWhite {
  const { data, width: w, height: h } = px;
  const samples: [number, number, number, number][] = [];
  for (const s of PAPER_STRIPS_MM)
    for (let y = s.y0; y <= s.y1; y += 2)
      for (let x = s.x0; x <= s.x1; x += 2) {
        const [sx, sy] = apply(found.H, [x, y]);
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
        const o = (iy * w + ix) * 4;
        samples.push([data[o], data[o + 1], data[o + 2], lum(data, o)]);
      }
  if (samples.length < 20) return { rgb: [255, 255, 255], gains: [1, 1, 1], clipped: true };
  // shadows (a hand, a fold) fall out: only the brighter half counts
  const cut = median(samples.map((s) => s[3]));
  const lit = samples.filter((s) => s[3] >= cut);
  const rgb = [0, 1, 2].map((c) => median(lit.map((s) => s[c]))) as [number, number, number];
  const clipped = rgb.some((v) => v >= 252);
  const gains = clipped ? ([1, 1, 1] as [number, number, number]) : (rgb.map((v) => Math.max(0.5, Math.min(2, PAPER_TARGET / Math.max(v, 1)))) as [number, number, number]);
  return { rgb, gains, clipped };
}

/** Multiplies each channel by its gain, in place. */
export function applyGains(px: Pixels, gains: [number, number, number]): Pixels {
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * gains[0]);
    d[i + 1] = Math.min(255, d[i + 1] * gains[1]);
    d[i + 2] = Math.min(255, d[i + 2] * gains[2]);
  }
  return px;
}
