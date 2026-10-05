// Rendering quality by device, so a mid-range Android stays smooth (5 Oct
// meeting, item 3). Two steps:
//   1. a starting tier from what the browser says about the device;
//   2. while the scene is actually animating (intro turn, dragging), if frames
//      are slow, the pixel ratio steps down. It never steps back up, so the
//      picture does not pump.
// The scene renders on demand, so idle gaps between frames are not slowness;
// only frames that follow each other closely are measured.

export type Tier = "yuksek" | "orta" | "dusuk";

export interface Quality {
  /** Upper bound of the device pixel ratio the canvas renders at. */
  maxDpr: number;
  /** Shadow map size of the key light. */
  shadowMap: number;
}

export const QUALITY: Record<Tier, Quality> = {
  yuksek: { maxDpr: 2, shadowMap: 2048 },
  orta: { maxDpr: 1.5, shadowMap: 2048 },
  dusuk: { maxDpr: 1.25, shadowMap: 1024 },
};

export const MIN_DPR = 1;
/** Frames further apart than this are idle gaps, not slow frames (seconds). */
export const GAP = 0.2;
/** Slower than ~30 fps on average over a sample counts as slow (seconds). */
export const SLOW_FRAME = 0.034;
export const SAMPLE = 30;

export function deviceTier(d: { desktop: boolean; cores?: number; memoryGb?: number }): Tier {
  const weakCpu = d.cores !== undefined && d.cores <= 4;
  const lowMemory = d.memoryGb !== undefined && d.memoryGb <= 3;
  if (d.desktop) return weakCpu && lowMemory ? "orta" : "yuksek";
  if (weakCpu || lowMemory) return "dusuk";
  return "orta";
}

export function browserTier(): Tier {
  if (typeof window === "undefined") return "orta";
  const nav = navigator as Navigator & { deviceMemory?: number };
  return deviceTier({
    desktop: window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches,
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
  });
}

/**
 * The pixel ratio to use after a sample of frame intervals (seconds), or the
 * current one. Uses the median, so one hitch (a texture upload) does not count.
 */
export function nextDpr(current: number, intervals: number[]): number {
  const frames = intervals.filter((t) => t > 0 && t < GAP);
  if (frames.length < SAMPLE || current <= MIN_DPR) return current;
  const sorted = [...frames].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= SLOW_FRAME) return current;
  return Math.max(MIN_DPR, Math.round((current - 0.25) * 100) / 100);
}
