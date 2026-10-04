// Measurements shown in the 2D plan view. Pure geometry so it can be tested.
// Units: metres in, centimetre labels out. Plan coordinates: x right,
// z towards the viewer (the back wall is at the top of the plan).

import { L_NOTCH, type RoomSpec } from "./spec";

export const PLAN_WALL_T = 0.12;

export interface PlanMeasure {
  id: string;
  /** Endpoints in (x, z). */
  from: [number, number];
  to: [number, number];
  label: string;
  kind: "oda" | "koltuk" | "bosluk";
}

export interface PlanBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const cm = (m: number) => `${Math.round(m * 100)} cm`;

/**
 * @param backZ z of the back wall's inner face
 * @param furniture furniture footprint (x = width, z = depth), centred on x = 0, z = 0
 */
export function planMeasures(spec: RoomSpec, backZ: number, furniture: { x: number; z: number }): PlanMeasure[] {
  const fw = furniture.x / 2;
  const fd = furniture.z / 2;
  const out: PlanMeasure[] = [];
  const offset = 0.32; // distance of outer dimension lines from the walls

  // furniture size, always shown
  out.push({ id: "koltuk-genislik", from: [-fw, fd + 0.22], to: [fw, fd + 0.22], label: cm(furniture.x), kind: "koltuk" });
  out.push({ id: "koltuk-derinlik", from: [fw + 0.22, -fd], to: [fw + 0.22, fd], label: cm(furniture.z), kind: "koltuk" });

  if (spec.shape === "yok") return out;

  const w = spec.widthCm / 100;
  const d = spec.depthCm / 100;
  const x0 = -w / 2;
  const x1 = w / 2;
  const back = backZ;
  const front = backZ + d;

  // room inner size, drawn outside the walls
  out.push({ id: "oda-genislik", from: [x0, back - PLAN_WALL_T - offset], to: [x1, back - PLAN_WALL_T - offset], label: cm(w), kind: "oda" });
  out.push({ id: "oda-derinlik", from: [x0 - PLAN_WALL_T - offset, back], to: [x0 - PLAN_WALL_T - offset, front], label: cm(d), kind: "oda" });

  // clearances around the furniture, drawn near its back so the labels stay
  // clear of the depth dimension on the right
  const zc = -fd + Math.min(0.12, fd / 2);
  const leftGap = -fw - x0;
  if (leftGap > 0.02) out.push({ id: "bosluk-sol", from: [x0, zc], to: [-fw, zc], label: cm(leftGap), kind: "bosluk" });

  const hasRightWall = spec.shape !== "kose";
  const rightGap = x1 - fw;
  if (hasRightWall && rightGap > 0.02) out.push({ id: "bosluk-sag", from: [fw, zc], to: [x1, zc], label: cm(rightGap), kind: "bosluk" });

  // free floor in front of the furniture, up to the opposite wall
  const hasFrontWall = spec.shape === "dikdortgen" || (spec.shape === "l" && 0 < x1 - w * L_NOTCH);
  const frontGap = front - fd;
  if (hasFrontWall && frontGap > 0.02) out.push({ id: "bosluk-on", from: [0, fd], to: [0, front], label: cm(frontGap), kind: "bosluk" });

  return out;
}

/** Area the plan camera has to show, including dimension lines. */
export function planBounds(spec: RoomSpec, backZ: number, furniture: { x: number; z: number }): PlanBounds {
  if (spec.shape === "yok") {
    const ex = furniture.x / 2 + 0.6;
    const ez = furniture.z / 2 + 0.6;
    return { minX: -ex, maxX: ex, minZ: -ez, maxZ: ez };
  }
  const w = spec.widthCm / 100;
  const d = spec.depthCm / 100;
  const pad = PLAN_WALL_T + 0.55;
  return { minX: -w / 2 - pad, maxX: w / 2 + PLAN_WALL_T + 0.15, minZ: backZ - pad, maxZ: backZ + d + PLAN_WALL_T + 0.15 };
}
