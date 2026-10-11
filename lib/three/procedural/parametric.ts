import * as THREE from "three";
import { SEAT_HEIGHT_CM, SEZLONG_EN_CM, heightCm, lowBack, seatCount, type Kol, type ParametricParams, type Uc } from "@/lib/parametric/spec";
import { WELT, buildParts, materials, taperedLeg, type Part } from "./furniture";
import { createRoundPoufGeometry, createRoundWeltGeometry, type RoundOptions } from "./round";

// Builds a parametric sofa / corner sofa / armchair / pouf in metres.
// Every upholstered part is a cushion primitive with UVs in metres, so the
// fabric pipeline (real-size repeat, AR export) works without any tuning.
//
// A corner / modular set is a straight run along the back wall plus, on each
// side, an arm, a corner (square with backs on both walls + a return run along
// the side wall, rotated 90°) or a chaise. Both corners make a U. The piece
// is centred later by prepareModel.

const ARM: Record<Kol, { w: number; rise: number; r: number }> = {
  ince: { w: 0.1, rise: 0.2, r: 0.03 },
  kalin: { w: 0.22, rise: 0.18, r: 0.06 },
  yuvarlak: { w: 0.19, rise: 0.2, r: 0.09 },
  kivrik: { w: 0.2, rise: 0.19, r: 0.03 },
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
  /** No cushion rises over the back frame (low back). */
  low: boolean;
  /** Fixed upholstered back: frame to the top, one padded panel per run. */
  fixed: boolean;
  /** One bench seat cushion per straight run. */
  bench: boolean;
  /** Button-tufted back panel (kapitone); implies a fixed back. */
  tufted: boolean;
  /**
   * A true Chesterfield: rolled arms and a buttoned back at one height, a roll
   * running round the top, buttons inside the arms too. A wingback keeps its
   * low arms under the wings.
   */
  chester: boolean;
  /** Depth of a fixed back's padding: the seat keeps about 60 cm in front of it. */
  padD: number;
}

const CHESTER_ROLL = 0.15;

/** From the back of the piece to the front of the back: frame, plus the padding of a fixed back. */
const backDepth = (c: Ctx) => BACK_D + (c.fixed ? c.padD : 0);

/** Top of the back frame: a loose cushion rises 6 cm over it unless the back is low or fixed. */
const frameTopOf = (c: Ctx) => (c.chester ? c.H - CHESTER_ROLL / 2 : c.low || c.fixed ? c.H : c.H - 0.06);

/**
 * One arm, centred on x, on side s (-1 left, +1 right), d deep around z.
 * A rolled (Chester) arm is a slimmer body under a round roll that overhangs
 * it outwards, as on the real thing; the outer edge stays where a plain arm's is.
 */
function armParts(c: Ctx, x: number, s: -1 | 1, d: number, z: number): Part[] {
  const { legH, seatTop, arm } = c;
  const armH = seatTop + arm.rise - legH;
  if (c.p.kol !== "kivrik") return [{ name: "kol", welt: WELT.front, wrap: 2, w: arm.w, h: armH, d, r: arm.r, bulge: { y: 0.01, x: 0.006 }, at: [x, legH + armH / 2, z] }];
  // a Chesterfield's arms run at the back's height, so the roll goes round in one line
  const top = c.chester ? c.H : seatTop + arm.rise;
  const roll = c.chester ? CHESTER_ROLL : 0.17;
  const bodyW = arm.w - 0.045;
  const bodyH = top - roll * 0.6 - legH;
  const parts: Part[] = [
    { name: "kol", wrap: 2, w: bodyW, h: bodyH, d, r: 0.03, bulge: { x: 0.008 }, at: [x - s * 0.0225, legH + bodyH / 2, z] },
    // nearly a cylinder along the depth: the radius is almost half of its width and height
    { name: "kol-kivrim", wrap: 2, w: arm.w, h: roll, d, r: roll / 2 - 0.002, at: [x, top - roll / 2, z] },
  ];
  if (c.chester) {
    // the buttoned inside of the arm, from the seat up under the roll, from the front to the back padding
    const zFront = z + d / 2 - 0.03;
    const zBack = z - d / 2 + backDepth(c);
    const len = zFront - zBack;
    const bottom = seatTop - 0.01;
    const h = top - roll * 0.55 - bottom;
    const t = 0.06;
    parts.push({
      name: "kol-ic",
      w: len,
      h,
      d: t,
      r: 0.025,
      bulge: { z: 0.008 },
      tufts: { spacing: 0.15, depth: 0.016 },
      // +z of the panel faces the seat: the arm's inner side
      rotY: s < 0 ? Math.PI / 2 : -Math.PI / 2,
      at: [x - s * (arm.w / 2 + t / 2 - 0.015), bottom + h / 2, (zFront + zBack) / 2],
    });
  }
  return parts;
}

/** A straight run centred on x, back towards -z. */
function straightRun(c: Ctx, len: number, armStart: boolean, armEnd: boolean, seats: number, back = true): Part[] {
  const { D, legH, baseTop, seatTop, arm } = c;
  const aw = arm.w;
  const x0 = -len / 2 + (armStart ? aw : 0);
  const x1 = len / 2 - (armEnd ? aw : 0);
  const innerW = x1 - x0;
  const cx = (x0 + x1) / 2;
  const bd = back ? backDepth(c) : 0;
  const parts: Part[] = [{ name: "govde", w: innerW + 0.02, h: baseTop - legH, d: D, r: 0.035, at: [cx, legH + (baseTop - legH) / 2, 0] }];

  if (armStart) parts.push(...armParts(c, -len / 2 + aw / 2, -1, D, 0));
  if (armEnd) parts.push(...armParts(c, len / 2 - aw / 2, 1, D, 0));

  if (back && c.p.kulak) {
    // wings (kulak): from the arm's top (or the seat) up to the back's top, standing on the arms' outer part
    const ww = Math.max(0.08, aw);
    // sunk into the arm by its rounding, so the wing grows out of the arm instead of resting on it
    const bottom = aw ? seatTop + arm.rise - arm.r - 0.02 : seatTop;
    const top = c.H - 0.02;
    const wd = Math.min(0.42, D * 0.5);
    for (const sx of [-1, 1] as const)
      parts.push({ name: "kulak", w: ww, h: top - bottom, d: wd, r: Math.min(0.07, ww / 2.2), bulge: { x: 0.012, y: 0.006 }, at: [sx * (len / 2 - ww / 2), bottom + (top - bottom) / 2, -D / 2 + wd / 2] });
  }

  if (back) {
    const frameTop = frameTopOf(c);
    parts.push({ name: "sirt-govde", w: innerW + 0.02, h: frameTop - baseTop, d: BACK_D, r: 0.06, bulge: { z: 0.006 }, at: [cx, baseTop + (frameTop - baseTop) / 2, -D / 2 + BACK_D / 2] });
    if (c.chester) {
      // the roll along the top of the back, meeting the arms' rolls at the corners
      const rd = backDepth(c) + 0.02;
      parts.push({ name: "sirt-kivrim", w: innerW + 0.08, h: CHESTER_ROLL, d: rd, r: CHESTER_ROLL / 2 - 0.002, at: [cx, c.H - CHESTER_ROLL / 2, -D / 2 + rd / 2] });
    }
  }

  const seatD = D - bd - 0.005;
  // seat cushions and back cushions are counted apart: a bench seat keeps one back cushion per person
  const row = (n: number) => {
    const w = (innerW - GAP * (n - 1)) / n;
    return Array.from({ length: n }, (_, k) => ({ w, x: x0 + w / 2 + k * (w + GAP) }));
  };
  for (const { w, x } of row(c.bench ? 1 : seats))
    parts.push({ name: "oturum", welt: WELT.seat, w, h: SEAT_T, d: seatD, r: 0.055, bulge: { y: 0.03, z: 0.01, x: 0.006 }, soft: 0.006, at: [x, baseTop + SEAT_T / 2, -D / 2 + bd + seatD / 2 + 0.005] });
  if (back) for (const { w, x } of row(c.fixed ? 1 : seats)) parts.push(backCushion(c, w, x, -D / 2 + BACK_D + 0.08));
  return parts;
}

function backCushion(c: Ctx, w: number, x: number, z: number): Part {
  const bottom = c.seatTop - 0.03;
  if (c.fixed) {
    // padding fixed to the frame, standing on the base behind the seat: one block with the frame,
    // up to its top (under the roll on a Chesterfield), deep enough that the seat is a real seat
    const frameFront = z - 0.08;
    const pb = c.baseTop;
    const top = c.chester ? c.H - CHESTER_ROLL * 0.55 : frameTopOf(c) - 0.008;
    const h = Math.max(0.2, top - pb);
    return {
      name: "sirt-dolgu",
      w,
      h,
      d: c.padD,
      r: c.tufted ? 0.035 : 0.06,
      bulge: { z: c.tufted ? 0.012 : 0.02, x: 0.004, y: 0.008 },
      soft: c.tufted ? undefined : 0.003,
      // buttons about a hand apart, as on a Chester back
      tufts: c.tufted ? { spacing: 0.15, depth: 0.02 } : undefined,
      welt: WELT.front,
      rotX: -0.025,
      at: [x, pb + h / 2, frameFront + c.padD / 2],
    };
  }
  const top = c.H + (c.low ? -0.02 : 0.01);
  const h = Math.max(0.2, top - bottom);
  return { name: "sirt-minder", welt: WELT.back, w, h, d: 0.17, r: 0.07, bulge: { z: 0.028, x: 0.008, y: 0.01 }, soft: 0.004, rotX: -0.15, at: [x, bottom + h / 2, z] };
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

/** Corner square (backs on both walls) + return run along the side wall, on side s (-1 left, +1 right). */
function addCorner(group: THREE.Group, c: Ctx, fabric: THREE.Material, s: -1 | 1, W: number, L: number, hasArms: boolean): Rect[] {
  const D = c.D;
  const cx = s * (W / 2 - D / 2);
  const bd = backDepth(c);
  const seatD = D - bd;
  const frameTop = frameTopOf(c);
  const frameH = frameTop - c.baseTop;
  group.add(
    partsGroup(
      [
        { name: "govde", w: D, h: c.baseTop - c.legH, d: D, r: 0.035, at: [cx, c.legH + (c.baseTop - c.legH) / 2, 0] },
        { name: "oturum", welt: WELT.seat, w: seatD, h: SEAT_T, d: seatD, r: 0.055, bulge: { y: 0.03, z: 0.008, x: 0.008 }, soft: 0.006, at: [cx - s * (bd / 2), c.baseTop + SEAT_T / 2, bd / 2] },
        { name: "sirt-govde", w: D, h: frameH, d: BACK_D, r: 0.06, at: [cx, c.baseTop + frameH / 2, -D / 2 + BACK_D / 2] },
        // side-wall back of the corner square (sized, not rotated)
        { name: "sirt-govde", w: BACK_D, h: frameH, d: D - BACK_D, r: 0.06, at: [s * (W / 2 - BACK_D / 2), c.baseTop + frameH / 2, BACK_D / 2] },
        backCushion(c, seatD * 0.92, cx - s * (bd / 2), -D / 2 + BACK_D + 0.08),
      ],
      fabric,
    ),
  );
  // the side-wall back cushion of the corner: a back cushion turned 90°
  const sideCushion = partsGroup([backCushion(c, seatD * 0.92, 0, 0)], fabric);
  sideCushion.rotation.y = -s * (Math.PI / 2);
  sideCushion.position.set(s * (W / 2 - BACK_D - 0.08), 0, BACK_D / 2);
  group.add(sideCushion);

  // return run along the side wall, arm at its front end
  const retLen = L - D;
  const ret = partsGroup(straightRun(c, retLen, hasArms && s < 0, hasArms && s > 0, seatCount("kose", retLen * 100)), fabric);
  ret.rotation.y = -s * (Math.PI / 2);
  ret.position.set(cx, 0, D / 2 + retLen / 2);
  group.add(ret);

  const xa = s * (W / 2 - D);
  const xb = s * (W / 2);
  return [
    { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: -D / 2, z1: D / 2 },
    { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: D / 2, z1: L - D / 2 },
  ];
}

/** Chaise (şezlong) on side s: one seat that runs forward to length L, arm on the outer side. */
function addChaise(group: THREE.Group, c: Ctx, fabric: THREE.Material, s: -1 | 1, W: number, L: number, hasArms: boolean): Rect {
  const D = c.D;
  const cw = SEZLONG_EN_CM / 100;
  const cx = s * (W / 2 - cw / 2);
  const zc = -D / 2 + L / 2;
  const aw = hasArms ? c.arm.w : 0;
  const innerCx = cx - s * (aw / 2);
  const frameTop = frameTopOf(c);
  const frameH = frameTop - c.baseTop;
  const bd = backDepth(c);
  const seatD = L - bd - 0.005;
  const parts: Part[] = [
    { name: "govde", w: cw - aw + 0.02, h: c.baseTop - c.legH, d: L, r: 0.035, at: [innerCx, c.legH + (c.baseTop - c.legH) / 2, zc] },
    { name: "sirt-govde", w: cw - aw + 0.02, h: frameH, d: BACK_D, r: 0.06, bulge: { z: 0.006 }, at: [innerCx, c.baseTop + frameH / 2, -D / 2 + BACK_D / 2] },
    { name: "oturum", welt: WELT.seat, w: cw - aw, h: SEAT_T, d: seatD, r: 0.055, bulge: { y: 0.03, z: 0.01, x: 0.006 }, soft: 0.006, at: [innerCx, c.baseTop + SEAT_T / 2, -D / 2 + bd + seatD / 2 + 0.005] },
    backCushion(c, cw - aw, innerCx, -D / 2 + BACK_D + 0.08),
  ];
  if (hasArms) {
    parts.push(...armParts(c, s * (W / 2 - aw / 2), s, L, zc));
  }
  group.add(partsGroup(parts, fabric));
  const xa = s * (W / 2 - cw);
  const xb = s * (W / 2);
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: -D / 2, z1: L - D / 2 };
}

export function buildParametric(p: ParametricParams): THREE.Group {
  const { fabric, wood } = materials();
  // a Chesterfield stands low, on short turned feet
  const chesterLook = p.sirtTipi === "kapitone" && p.kol === "kivrik" && !p.kulak && p.ayak === "konik";
  const legH = chesterLook ? 0.09 : LEG_H[p.ayak];
  const seatTop = SEAT_HEIGHT_CM / 100;
  const c: Ctx = {
    p,
    D: p.derinlikCm / 100,
    H: heightCm(p) / 100,
    legH,
    seatTop,
    baseTop: seatTop - SEAT_T,
    arm: ARM[p.tip === "puf" ? "yok" : p.kol],
    low: lowBack(p),
    fixed: p.sirtTipi === "sabit" || p.sirtTipi === "kapitone",
    tufted: p.sirtTipi === "kapitone",
    chester: p.sirtTipi === "kapitone" && p.kol === "kivrik" && !p.kulak && p.tip !== "puf",
    padD: Math.min(0.26, Math.max(0.09, p.derinlikCm / 100 - BACK_D - 0.6)),
    bench: p.oturumTipi === "tek",
  };
  const W = p.genislikCm / 100;
  const D = c.D;
  const group = new THREE.Group();
  group.name = `parametrik-${p.tip}`;
  const hasArms = p.kol !== "yok";

  if (p.tip === "puf" && p.form === "yuvarlak") {
    const R = W / 2;
    const o: RoundOptions = { R, h: c.H - legH, r: Math.min(0.045, R / 5), crown: 0.012, button: 0.02 };
    const mesh = new THREE.Mesh(createRoundPoufGeometry(o), fabric);
    mesh.name = "puf";
    // occlusion is baked against its box (ao.ts): close enough for a round body
    mesh.userData.cushion = { w: W, h: o.h, d: W, r: o.r };
    mesh.position.y = legH + o.h / 2;
    for (const s of [1, -1] as const) {
      const welt = new THREE.Mesh(createRoundWeltGeometry(o, s), fabric);
      welt.name = "biye";
      welt.userData.aoTarget = true;
      mesh.add(welt);
    }
    group.add(mesh);
    // legs inside the circle
    const k = R * 0.62;
    addSupports(group, c, [{ x0: -k - 0.06, x1: k + 0.06, z0: -k - 0.06, z1: k + 0.06 }], wood);
    return group;
  }

  if (p.tip === "puf") {
    const top = new THREE.Group();
    top.add(
      partsGroup([{ name: "puf", welt: WELT.seat, w: W, h: c.H - legH, d: D, r: Math.min(0.08, W / 6), bulge: { y: 0.02, x: 0.008, z: 0.008 }, at: [0, legH + (c.H - legH) / 2, 0] }], fabric),
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

  // corner / modular set: the back-wall run between the two ends, then each end
  const endW = (uc: Uc) => (uc === "kose" ? D : uc === "sezlong" ? SEZLONG_EN_CM / 100 : 0);
  const solUc = p.solUc ?? "kol";
  const sagUc = p.sagUc ?? "kol";
  const xl = -W / 2 + endW(solUc);
  const xr = W / 2 - endW(sagUc);
  const mainLen = xr - xl;
  const main = partsGroup(straightRun(c, mainLen, hasArms && solUc === "kol", hasArms && sagUc === "kol", seatCount("kose", mainLen * 100)), fabric);
  main.position.x = (xl + xr) / 2;
  group.add(main);
  const rects: Rect[] = [{ x0: xl, x1: xr, z0: -D / 2, z1: D / 2 }];

  for (const [s, uc, boyCm] of [
    [-1, solUc, p.solBoyCm],
    [1, sagUc, p.sagBoyCm],
  ] as const) {
    if (uc === "kose") rects.push(...addCorner(group, c, fabric, s, W, (boyCm ?? 220) / 100, hasArms));
    if (uc === "sezlong") rects.push(addChaise(group, c, fabric, s, W, (boyCm ?? 160) / 100, hasArms));
  }
  addSupports(group, c, rects, wood);
  return group;
}
