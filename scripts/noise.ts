// Deterministic, tileable noise used by the texture generators.


export function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Periodic value noise; x,y in lattice units, wraps every `px` × `py` cells. */
export function vnoise(x: number, y: number, px: number, py: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const xa = ((x0 % px) + px) % px, xb = (xa + 1) % px;
  const ya = ((y0 % py) + py) % py, yb = (ya + 1) % py;
  const a = hash(xa, ya, seed), b = hash(xb, ya, seed);
  const c = hash(xa, yb, seed), d = hash(xb, yb, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Periodic fBm over a size×size tile; `base` = number of cells across the tile. */
export function fbmTile(x: number, y: number, N: number, base: number, octaves: number, seed: number): number {
  let sum = 0, amp = 0.5, norm = 0, cells = base;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise((x / N) * cells, (y / N) * cells, cells, cells, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    cells *= 2;
  }
  return sum / norm;
}
