// Measurements shown in the 2D plan view. Pure geometry so it can be tested.
// Room coordinates in metres (back wall inner face at z = 0, x centred);
// labels in centimetres. The plan is drawn with the back wall at the top.

import { L_NOTCH, type RoomSpec } from "./spec";
import type { Footprint } from "./layout";

export const PLAN_WALL_T = 0.12;

export interface PlanMeasure {
  id: string;
  /** Endpoints in (x, z). */
  from: [number, number];
  to: [number, number];
  label: string;
  kind: "oda" | "koltuk" | "bosluk";
}

export type PlanBounds = Footprint;

const cm = (m: number) => `${Math.round(m * 100)} cm`;
const MIN_GAP = 0.05;

/**
 * Room size, the selected piece's size and its free distance on each side,
 * up to the nearest wall or other piece.
 * @param piece footprint (axis-aligned box) of the selected piece, or null
 * @param others footprints of the other pieces
 */
export function planMeasures(spec: RoomSpec, piece: Footprint | null, others: Footprint[] = []): PlanMeasure[] {
  const out: PlanMeasure[] = [];

  if (piece) {
    const cx = (piece.minX + piece.maxX) / 2;
    out.push({ id: "koltuk-genislik", from: [piece.minX, piece.maxZ + 0.22], to: [piece.maxX, piece.maxZ + 0.22], label: cm(piece.maxX - piece.minX), kind: "koltuk" });
    out.push({ id: "koltuk-derinlik", from: [piece.maxX + 0.22, piece.minZ], to: [piece.maxX + 0.22, piece.maxZ], label: cm(piece.maxZ - piece.minZ), kind: "koltuk" });
    if (spec.shape === "yok") return out;

    const w = spec.widthCm / 100;
    const d = spec.depthCm / 100;
    const x0 = -w / 2;
    const x1 = w / 2;
    const notchX = x1 - w * L_NOTCH;
    const notchZ = d - d * L_NOTCH;
    // clearances, drawn near the piece's back so labels stay clear of the depth dimension
    const zc = piece.minZ + Math.min(0.12, (piece.maxZ - piece.minZ) / 2);

    // nearest other piece crossing the measuring line, on each side
    const acrossZ = others.filter((o) => o.minZ < zc && o.maxZ > zc);
    const acrossX = others.filter((o) => o.minX < cx && o.maxX > cx);
    const nearest = (walls: number | null, candidates: number[], pick: (a: number, b: number) => number) =>
      [walls, ...candidates].filter((v): v is number => v !== null).reduce((a, b) => pick(a, b), NaN as number);
    const maxOf = (a: number, b: number) => (Number.isNaN(a) ? b : Math.max(a, b));
    const minOf = (a: number, b: number) => (Number.isNaN(a) ? b : Math.min(a, b));

    const leftEdge = nearest(x0, acrossZ.filter((o) => o.maxX <= piece.minX + 1e-6).map((o) => o.maxX), maxOf);
    if (piece.minX - leftEdge > MIN_GAP)
      out.push({ id: "bosluk-sol", from: [leftEdge, zc], to: [piece.minX, zc], label: cm(piece.minX - leftEdge), kind: "bosluk" });

    // the right wall is x1, except below the L notch where it steps in
    const rightWall = spec.shape === "kose" ? null : spec.shape === "l" && zc > notchZ ? notchX : x1;
    const rightEdge = nearest(rightWall, acrossZ.filter((o) => o.minX >= piece.maxX - 1e-6).map((o) => o.minX), minOf);
    if (!Number.isNaN(rightEdge) && rightEdge - piece.maxX > MIN_GAP)
      out.push({ id: "bosluk-sag", from: [piece.maxX, zc], to: [rightEdge, zc], label: cm(rightEdge - piece.maxX), kind: "bosluk" });

    const backEdge = nearest(0, acrossX.filter((o) => o.maxZ <= piece.minZ + 1e-6).map((o) => o.maxZ), maxOf);
    if (piece.minZ - backEdge > MIN_GAP)
      out.push({ id: "bosluk-arka", from: [cx, backEdge], to: [cx, piece.minZ], label: cm(piece.minZ - backEdge), kind: "bosluk" });

    const frontWall = spec.shape === "kose" ? null : spec.shape === "l" && cx > notchX ? notchZ : d;
    const frontEdge = nearest(frontWall, acrossX.filter((o) => o.minZ >= piece.maxZ - 1e-6).map((o) => o.minZ), minOf);
    if (!Number.isNaN(frontEdge) && frontEdge - piece.maxZ > MIN_GAP)
      out.push({ id: "bosluk-on", from: [cx, piece.maxZ], to: [cx, frontEdge], label: cm(frontEdge - piece.maxZ), kind: "bosluk" });
  }

  if (spec.shape !== "yok") {
    const w = spec.widthCm / 100;
    const d = spec.depthCm / 100;
    const offset = 0.32;
    out.push({ id: "oda-genislik", from: [-w / 2, -PLAN_WALL_T - offset], to: [w / 2, -PLAN_WALL_T - offset], label: cm(w), kind: "oda" });
    out.push({ id: "oda-derinlik", from: [-w / 2 - PLAN_WALL_T - offset, 0], to: [-w / 2 - PLAN_WALL_T - offset, d], label: cm(d), kind: "oda" });
  }
  return out;
}

/** Area the plan camera has to show, including dimension lines. */
export function planBounds(spec: RoomSpec, pieces: Footprint[]): PlanBounds {
  if (spec.shape === "yok") {
    const all = pieces.length ? pieces : [{ minX: -1, maxX: 1, minZ: 0, maxZ: 1 }];
    return {
      minX: Math.min(...all.map((p) => p.minX)) - 0.6,
      maxX: Math.max(...all.map((p) => p.maxX)) + 0.6,
      minZ: Math.min(...all.map((p) => p.minZ)) - 0.6,
      maxZ: Math.max(...all.map((p) => p.maxZ)) + 0.6,
    };
  }
  const w = spec.widthCm / 100;
  const d = spec.depthCm / 100;
  const pad = PLAN_WALL_T + 0.55;
  return { minX: -w / 2 - pad, maxX: w / 2 + PLAN_WALL_T + 0.15, minZ: -pad, maxZ: d + PLAN_WALL_T + 0.15 };
}
