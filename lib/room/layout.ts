// Furniture layout: which pieces are in the room, where, turned how, in which
// fabric. Pure data and geometry so it can be tested and shared in a link.
//
// Room coordinates (metres): the back wall's inner face is z = 0, the room
// extends towards +z, x is centred. A piece at rot = 0 faces +z (its back to
// the back wall); rot = 90 faces +x (its back to the left wall).

import { L_NOTCH, type RoomSpec } from "./spec";

export interface Placement {
  id: string;
  modelSlug: string;
  fabricCode: string;
  x: number;
  z: number;
  /** Rotation about the vertical axis, degrees. */
  rot: number;
}

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Dims = { w: number; d: number }; // centimetres

/** Gap left between furniture and a wall it is pushed against. */
export const WALL_GAP = 0.03;
/** Distance within which a piece snaps to a wall. */
export const SNAP = 0.1;
const STUDIO_HALF = 6;

export function normaliseRot(rot: number): number {
  const r = ((Math.round(rot) % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

/** Half extents of the axis-aligned box around a rotated piece, metres. */
export function halfExtents(dims: Dims, rot: number): { hx: number; hz: number } {
  const a = (rot * Math.PI) / 180;
  const w = dims.w / 100, d = dims.d / 100;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return { hx: (w * c + d * s) / 2, hz: (w * s + d * c) / 2 };
}

export function footprint(p: Pick<Placement, "x" | "z" | "rot">, dims: Dims): Footprint {
  const { hx, hz } = halfExtents(dims, p.rot);
  return { minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz };
}

/** Inner rectangle of the room (the whole floor for the studio). */
export function roomRect(spec: RoomSpec): Footprint {
  if (spec.shape === "yok") return { minX: -STUDIO_HALF, maxX: STUDIO_HALF, minZ: -STUDIO_HALF / 2, maxZ: STUDIO_HALF };
  const w = spec.widthCm / 100, d = spec.depthCm / 100;
  return { minX: -w / 2, maxX: w / 2, minZ: 0, maxZ: d };
}

/** Which sides of the room rectangle have a wall to snap to. */
function wallSides(spec: RoomSpec) {
  const s = spec.shape;
  return {
    back: s !== "yok",
    left: s !== "yok",
    right: s === "dikdortgen" || s === "l",
    front: s === "dikdortgen" || s === "l",
  };
}

/** The cut-out corner of an L room (front-right), or null. */
function notch(spec: RoomSpec): Footprint | null {
  if (spec.shape !== "l") return null;
  const r = roomRect(spec);
  return { minX: r.maxX - (spec.widthCm / 100) * L_NOTCH, maxX: r.maxX, minZ: r.maxZ - (spec.depthCm / 100) * L_NOTCH, maxZ: r.maxZ };
}

export function overlaps(a: Footprint, b: Footprint, tolerance = 0.01): boolean {
  return a.minX < b.maxX - tolerance && a.maxX > b.minX + tolerance && a.minZ < b.maxZ - tolerance && a.maxZ > b.minZ + tolerance;
}

/**
 * Keeps a piece inside the room and lets it snap to nearby walls.
 * Returns the corrected position (rotation unchanged).
 */
export function constrain(p: Placement, dims: Dims, spec: RoomSpec): Placement {
  const { hx, hz } = halfExtents(dims, p.rot);
  const r = roomRect(spec);
  const sides = wallSides(spec);
  const minX = r.minX + (sides.left ? WALL_GAP : 0) + hx;
  const maxX = r.maxX - (sides.right ? WALL_GAP : 0) - hx;
  const minZ = r.minZ + (sides.back ? WALL_GAP : 0) + hz;
  const maxZ = r.maxZ - (sides.front ? WALL_GAP : 0) - hz;

  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  let x = clamp(p.x, minX, maxX);
  let z = clamp(p.z, minZ, maxZ);

  // magnetic walls
  if (sides.back && z - minZ < SNAP) z = minZ;
  if (sides.left && x - minX < SNAP) x = minX;
  if (sides.right && maxX - x < SNAP) x = maxX;
  if (sides.front && maxZ - z < SNAP) z = maxZ;

  // keep out of the L notch: push out along the shorter way
  const n = notch(spec);
  if (n) {
    const f = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
    if (overlaps(f, n, 0)) {
      const pushX = f.maxX - (n.minX - WALL_GAP);
      const pushZ = f.maxZ - (n.minZ - WALL_GAP);
      if (pushX <= pushZ) x -= pushX;
      else z -= pushZ;
    }
  }
  return { ...p, x: round(x), z: round(z), rot: normaliseRot(p.rot) };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Finds a free spot for a new piece: along the back wall first, then against
 * the side walls, then anywhere on a grid. Prefers spots close to the centre.
 */
export function findFreeSpot(
  dims: Dims,
  spec: RoomSpec,
  placed: { p: Placement; dims: Dims }[],
): Pick<Placement, "x" | "z" | "rot"> {
  const r = roomRect(spec);
  const taken = placed.map((o) => footprint(o.p, o.dims));
  const free = (c: Pick<Placement, "x" | "z" | "rot">) => {
    const fixed = constrain({ id: "", modelSlug: "", fabricCode: "", ...c }, dims, spec);
    const f = footprint(fixed, dims);
    const n = notch(spec);
    if (n && overlaps(f, n, 0)) return null;
    // a little breathing room between pieces
    return taken.every((t) => !overlaps(f, { minX: t.minX - 0.1, maxX: t.maxX + 0.1, minZ: t.minZ - 0.1, maxZ: t.maxZ + 0.1 }, 0)) ? fixed : null;
  };
  const sweep = (from: number, to: number) => {
    const out: number[] = [];
    const mid = (from + to) / 2;
    for (let k = 0; k <= 60; k++) for (const s of k === 0 ? [0] : [-1, 1]) out.push(mid + s * k * 0.1);
    return out.filter((v) => v >= from && v <= to);
  };
  const width = r.maxX - r.minX;
  const depth = r.maxZ - r.minZ;
  const candidates: Pick<Placement, "x" | "z" | "rot">[] = [
    ...sweep(r.minX, r.maxX).map((x) => ({ x, z: r.minZ, rot: 0 })),
    ...sweep(r.minZ, r.maxZ).map((z) => ({ x: r.minX, z, rot: 90 })),
    ...sweep(r.minZ, r.maxZ).map((z) => ({ x: r.maxX, z, rot: -90 })),
  ];
  for (let gz = 0.5; gz < depth; gz += 0.25)
    for (const x of sweep(r.minX, r.minX + width)) candidates.push({ x, z: r.minZ + gz, rot: 0 });
  for (const c of candidates) {
    const ok = free(c);
    if (ok) return { x: ok.x, z: ok.z, rot: ok.rot };
  }
  // nowhere free: put it in the middle and let the overlap warning speak
  return { x: 0, z: (r.minZ + r.maxZ) / 2, rot: 0 };
}

/** Ids of pieces that overlap another piece. */
export function overlapping(items: { p: Placement; dims: Dims }[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (overlaps(footprint(items[i].p, items[i].dims), footprint(items[j].p, items[j].dims))) {
        out.add(items[i].p.id);
        out.add(items[j].p.id);
      }
  return out;
}

// ------------------------------------------------------------ link format ---
// "moduler-kanepe.LUMA-02.0.52.0_berjer.SIENA-04.150.140.-90"
// model . fabric . x(cm) . z(cm) . rotation(deg), pieces separated by "_".

export function encodeLayout(items: Placement[]): string {
  return items
    .map((p) => [p.modelSlug, p.fabricCode, Math.round(p.x * 100), Math.round(p.z * 100), normaliseRot(p.rot)].join("."))
    .join("_");
}

export function decodeLayout(value: string | null | undefined): Placement[] | null {
  if (!value) return null;
  const items: Placement[] = [];
  for (const [i, part] of value.split("_").entries()) {
    const [modelSlug, fabricCode, x, z, rot] = part.split(".");
    if (!modelSlug || !fabricCode || [x, z, rot].some((v) => v === undefined || !/^-?\d+$/.test(v))) return null;
    items.push({ id: `m${i + 1}`, modelSlug, fabricCode: fabricCode.toLocaleUpperCase("tr-TR"), x: Number(x) / 100, z: Number(z) / 100, rot: normaliseRot(Number(rot)) });
  }
  return items.length > 0 && items.length <= 12 ? items : null;
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `y${Date.now().toString(36)}${counter}`;
}
