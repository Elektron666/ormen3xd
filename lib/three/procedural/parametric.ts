import * as THREE from "three";
import { BACK_HEIGHT_CM, SEAT_HEIGHT_CM, seatCount, type Kol, type ParametricParams } from "@/lib/parametric/spec";
import { buildParts, materials, taperedLeg, type Part } from "./furniture";

// Builds a parametric sofa / corner sofa / armchair / pouf in metres.
// Every upholstered part is a cushion primitive with UVs in metres, so the
// fabric pipeline (real-size repeat, AR export) works without any tuning.
//
// A corner sofa is three modules: a straight main run along the back wall,
// a corner square with backs on both walls, and a straight return run
// along the side wall (rotated 90°). The piece is centred later by prepareModel.

const ARM: Record<Kol, { w: number; rise: number; r: number }> = {
  ince: { w: 0.1, rise: 0.2, r: 0.03 },
  kalin: { w: 0.22, rise: 0.18, r: 0.06 },
  yuvarlak: { w: 0.19, rise: 0.2, r: 0.09 },
  yok: { w: 0, rise: 0, r: 0 },
};
const LEG_H = { konik: 0.13, metal: 0.13, gizli: 0.04 } as const;
const SEAT_T = 0.15; // seat cushion thickness
const BACK_D = 0.17; // back frame depth
const GAP = 0.008; // between cushions

interface Ctx {
  p: ParametricParams;
  D: number;
  H: number;
  legH: number;
  baseTop: number;
  seatTop: number;
  arm: { w: number; rise: number; r: number };
}

/** A straight run centred on x, back towards -z. */
function straightRun(c: Ctx, len: number, armStart: boolean, armEnd: boolean, seats: number, back = true): Part[] {
  const { D, H, legH, baseTop, seatTop, arm } = c;
  const aw = arm.w;
  const x0 = -len / 2 + (armStart ? aw : 0);
  const x1 = len / 2 - (armEnd ? aw : 0);
  const innerW = x1 - x0;
  const cx = (x0 + x1) / 2;
  const bd = back ? BACK_D : 0;
  const parts: Part[] = [{ name: "govde", w: innerW + 0.02, h: baseTop - legH, d: D, r: 0.035, at: [cx, legH + (baseTop - legH) / 2, 0] }];

  const armH = seatTop + arm.rise - legH;
  if (armStart) parts.push({ name: "kol", w: aw, h: armH, d: D, r: arm.r, bulge: { y: 0.01, x: 0.006 }, at: [-len / 2 + aw / 2, legH + armH / 2, 0] });
  if (armEnd) parts.push({ name: "kol", w: aw, h: armH, d: D, r: arm.r, bulge: { y: 0.01, x: 0.006 }, at: [len / 2 - aw / 2, legH + armH / 2, 0] });

  if (back) {
    const frameTop = c.p.sirt === "alcak" ? H : H - 0.06;
    parts.push({ name: "sirt-govde", w: innerW + 0.02, h: frameTop - baseTop, d: BACK_D, r: 0.06, bulge: { z: 0.006 }, at: [cx, baseTop + (frameTop - baseTop) / 2, -D / 2 + BACK_D / 2] });
  }

  const seatD = D - bd - 0.005;
  const seatW = (innerW - GAP * (seats - 1)) / seats;
  for (let k = 0; k < seats; k++) {
    const x = x0 + seatW / 2 + k * (seatW + GAP);
    parts.push({ name: "oturum", w: seatW, h: SEAT_T, d: seatD, r: 0.055, bulge: { y: 0.022, z: 0.01, x: 0.006 }, at: [x, baseTop + SEAT_T / 2, -D / 2 + bd + seatD / 2 + 0.005] });
    if (back) parts.push(backCushion(c, seatW, x, -D / 2 + BACK_D + 0.08));
  }
  return parts;
}

function backCushion(c: Ctx, w: number, x: number, z: number): Part {
  const bottom = c.seatTop - 0.03;
  const top = c.H + (c.p.sirt === "alcak" ? -0.02 : 0.01);
  const h = Math.max(0.2, top - bottom);
  return { name: "sirt-minder", w, h, d: 0.17, r: 0.07, bulge: { z: 0.028, x: 0.008, y: 0.01 }, rotX: -0.15, at: [x, bottom + h / 2, z] };
}

function partsGroup(parts: Part[], fabric: THREE.Material): THREE.Group {
  return buildParts(parts, fabric);
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

function addSupports(group: THREE.Group, c: Ctx, rects: Rect[], wood: THREE.Material) {
  const ayak = c.p.ayak;
  if (ayak === "gizli") {
    const plinth = new THREE.MeshStandardMaterial({ name: "kaide", color: "#2b2622", roughness: 0.8 });
    for (const r of rects) {
      const g = new THREE.BoxGeometry(r.x1 - r.x0 - 0.08, c.legH, r.z1 - r.z0 - 0.08);
      const m = new THREE.Mesh(g, plinth);
      m.name = "kaide";
      m.position.set((r.x0 + r.x1) / 2, c.legH / 2, (r.z0 + r.z1) / 2);
      group.add(m);
    }
    return;
  }
  const metal = new THREE.MeshStandardMaterial({ name: "metal", color: "#26262a", metalness: 0.85, roughness: 0.35 });
  const points: [number, number][] = [];
  const inset = 0.06;
  for (const r of rects) {
    for (const x of [r.x0 + inset, r.x1 - inset])
      for (const z of [r.z0 + inset, r.z1 - inset]) if (!points.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.2)) points.push([x, z]);
  }
  // long runs get a middle pair so they do not look like a bridge
  for (const r of rects) {
    if (r.x1 - r.x0 > 2.2) for (const z of [r.z0 + inset, r.z1 - inset]) points.push([(r.x0 + r.x1) / 2, z]);
    if (r.z1 - r.z0 > 2.2) for (const x of [r.x0 + inset, r.x1 - inset]) points.push([x, (r.z0 + r.z1) / 2]);
  }
  for (const [x, z] of points) {
    const leg =
      ayak === "konik"
        ? taperedLeg(c.legH, 0.019, 0.013, wood)
        : (() => {
            const g = new THREE.CylinderGeometry(0.008, 0.008, c.legH, 12);
            g.translate(0, -c.legH / 2, 0);
            const m = new THREE.Mesh(g, metal);
            m.name = "ayak";
            return m;
          })();
    leg.position.set(x, c.legH, z);
    group.add(leg);
  }
}

export function buildParametric(p: ParametricParams): THREE.Group {
  const { fabric, wood } = materials();
  const legH = LEG_H[p.ayak];
  const seatTop = SEAT_HEIGHT_CM / 100;
  const c: Ctx = {
    p,
    D: p.derinlikCm / 100,
    H: BACK_HEIGHT_CM[p.sirt] / 100,
    legH,
    seatTop,
    baseTop: seatTop - SEAT_T,
    arm: ARM[p.tip === "puf" ? "yok" : p.kol],
  };
  const W = p.genislikCm / 100;
  const D = c.D;
  const group = new THREE.Group();
  group.name = `parametrik-${p.tip}`;
  const hasArms = p.kol !== "yok";

  if (p.tip === "puf") {
    const top = new THREE.Group();
    top.add(
      partsGroup([{ name: "puf", w: W, h: seatTop - legH, d: D, r: Math.min(0.08, W / 6), bulge: { y: 0.02, x: 0.008, z: 0.008 }, at: [0, legH + (seatTop - legH) / 2, 0] }], fabric),
    );
    group.add(top);
    addSupports(group, c, [{ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2 }], wood);
    return group;
  }

  if (p.tip !== "kose") {
    group.add(partsGroup(straightRun(c, W, hasArms, hasArms, seatCount(p.tip, W * 100)), fabric));
    addSupports(group, c, [{ x0: -W / 2, x1: W / 2, z0: -D / 2, z1: D / 2 }], wood);
    return group;
  }

  // corner sofa
  const s = p.koseYonu === "sol" ? -1 : 1;
  const L = (p.koseBoyCm ?? 220) / 100;
  const mainLen = W - D;
  const retLen = L - D;

  // main run: from the far end to the corner square; arm only at the far end
  const main = partsGroup(straightRun(c, mainLen, hasArms && s > 0, hasArms && s < 0, seatCount("kose", mainLen * 100)), fabric);
  main.position.x = -s * (D / 2);
  group.add(main);

  // corner square: backs on the back wall and on the side wall
  const cx = s * (W / 2 - D / 2);
  const seatD = D - BACK_D;
  const cornerParts: Part[] = [
    { name: "govde", w: D, h: c.baseTop - legH, d: D, r: 0.035, at: [cx, legH + (c.baseTop - legH) / 2, 0] },
    { name: "oturum", w: seatD, h: SEAT_T, d: seatD, r: 0.055, bulge: { y: 0.022, z: 0.008, x: 0.008 }, at: [cx - s * (BACK_D / 2), c.baseTop + SEAT_T / 2, BACK_D / 2] },
  ];
  const frameTop = p.sirt === "alcak" ? c.H : c.H - 0.06;
  const frameH = frameTop - c.baseTop;
  cornerParts.push({ name: "sirt-govde", w: D, h: frameH, d: BACK_D, r: 0.06, at: [cx, c.baseTop + frameH / 2, -D / 2 + BACK_D / 2] });
  // side-wall back of the corner square (a box rotated by its dimensions, not by rotation)
  cornerParts.push({ name: "sirt-govde", w: BACK_D, h: frameH, d: D - BACK_D, r: 0.06, at: [s * (W / 2 - BACK_D / 2), c.baseTop + frameH / 2, BACK_D / 2] });
  cornerParts.push(backCushion(c, seatD * 0.92, cx - s * (BACK_D / 2), -D / 2 + BACK_D + 0.08));
  group.add(partsGroup(cornerParts, fabric));
  // the side-wall back cushion of the corner: a back cushion turned 90°
  const sideCushion = partsGroup([backCushion(c, seatD * 0.92, 0, 0)], fabric);
  sideCushion.rotation.y = -s * (Math.PI / 2);
  sideCushion.position.set(s * (W / 2 - BACK_D - 0.08), 0, BACK_D / 2);
  group.add(sideCushion);

  // return run along the side wall, arm at its front end
  const ret = partsGroup(straightRun(c, retLen, hasArms && s < 0, hasArms && s > 0, seatCount("kose", retLen * 100)), fabric);
  ret.rotation.y = -s * (Math.PI / 2);
  ret.position.set(cx, 0, D / 2 + retLen / 2);
  group.add(ret);

  addSupports(
    group,
    c,
    [
      { x0: Math.min(-s * (W / 2), s * (W / 2 - D)), x1: Math.max(-s * (W / 2), s * (W / 2 - D)), z0: -D / 2, z1: D / 2 },
      { x0: Math.min(s * (W / 2 - D), s * (W / 2)), x1: Math.max(s * (W / 2 - D), s * (W / 2)), z0: -D / 2, z1: D / 2 },
      { x0: Math.min(s * (W / 2 - D), s * (W / 2)), x1: Math.max(s * (W / 2 - D), s * (W / 2)), z0: D / 2, z1: L - D / 2 },
    ],
    wood,
  );
  return group;
}
