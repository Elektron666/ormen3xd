import * as THREE from "three";
import { createCushionGeometry, type CushionOptions } from "./cushion";

// Placeholder furniture built from code (metres). Upholstered parts use the
// material named FABRIC_MATERIAL so they go through exactly the same fabric
// pipeline as an uploaded GLB.

import { FABRIC_MATERIAL, WOOD_MATERIAL } from "../constants";

interface Part extends CushionOptions {
  name: string;
  at: [number, number, number];
  rotX?: number;
}

function buildParts(parts: Part[], fabric: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  for (const part of parts) {
    const mesh = new THREE.Mesh(createCushionGeometry(part), fabric);
    mesh.name = part.name;
    mesh.position.set(...part.at);
    if (part.rotX) mesh.rotation.x = part.rotX;
    group.add(mesh);
  }
  return group;
}

function taperedLeg(height: number, rTop: number, rBottom: number, wood: THREE.Material, splay = 0): THREE.Mesh {
  const g = new THREE.CylinderGeometry(rTop, rBottom, height, 24, 1);
  g.translate(0, -height / 2, 0);
  const m = new THREE.Mesh(g, wood);
  m.name = "ayak";
  m.rotation.z = splay;
  return m;
}

function materials() {
  const fabric = new THREE.MeshPhysicalMaterial({ name: FABRIC_MATERIAL, color: "#cccccc", roughness: 1 });
  const wood = new THREE.MeshPhysicalMaterial({
    name: WOOD_MATERIAL,
    color: "#4A3022",
    roughness: 0.45,
    clearcoat: 0.25,
    clearcoatRoughness: 0.5,
  });
  return { fabric, wood };
}

/** Three-seat modular sofa, 236 × 96 × ~82 cm. */
export function createModularSofa(): THREE.Group {
  const { fabric, wood } = materials();
  const legH = 0.07;
  const W = 2.36, D = 0.94, armW = 0.22;
  const innerW = W - 2 * armW;
  const baseTop = legH + 0.22;
  const seatW = (innerW - 0.016) / 3;
  const seatD = 0.74;
  const seatH = 0.17;

  const parts: Part[] = [
    { name: "govde", w: innerW + 0.02, h: 0.22, d: D, r: 0.035, at: [0, legH + 0.11, 0] },
    ...[-1, 1].map<Part>((s) => ({
      name: s < 0 ? "kol-sol" : "kol-sag",
      w: armW, h: 0.56, d: D, r: 0.095,
      bulge: { y: 0.012, x: 0.008 },
      at: [s * (W / 2 - armW / 2), legH + 0.28, 0],
    })),
    { name: "sirt-govde", w: innerW + 0.02, h: 0.38, d: 0.18, r: 0.07, bulge: { z: 0.006 }, at: [0, baseTop + 0.19, -D / 2 + 0.09] },
    ...[-1, 0, 1].map<Part>((k) => ({
      name: `oturum-${k + 2}`,
      w: seatW, h: seatH, d: seatD, r: 0.06,
      bulge: { y: 0.024, z: 0.01, x: 0.006 },
      at: [k * (seatW + 0.008), baseTop + seatH / 2, D / 2 + 0.005 - seatD / 2],
    })),
    ...[-1, 0, 1].map<Part>((k) => ({
      name: `sirt-minder-${k + 2}`,
      w: seatW, h: 0.48, d: 0.2, r: 0.085,
      bulge: { z: 0.03, x: 0.008, y: 0.01 },
      rotX: -0.17,
      at: [k * (seatW + 0.008), baseTop + 0.29, -0.3],
    })),
  ];
  const group = buildParts(parts, fabric);

  for (const x of [-W / 2 + 0.07, W / 2 - 0.07]) {
    for (const z of [-D / 2 + 0.07, D / 2 - 0.07]) {
      const leg = taperedLeg(legH, 0.019, 0.014, wood);
      leg.position.set(x, legH, z);
      group.add(leg);
    }
  }
  group.name = "moduler-kanepe";
  return group;
}

/** Lounge armchair (berjer) on splayed walnut legs. */
export function createArmchair(): THREE.Group {
  const { fabric, wood } = materials();
  const legH = 0.16;
  const W = 0.8, D = 0.8;
  const seatTop = legH + 0.15;
  const parts: Part[] = [
    { name: "govde", w: W, h: 0.15, d: D, r: 0.05, bulge: { x: 0.006, z: 0.006 }, at: [0, legH + 0.075, 0] },
    ...[-1, 1].map<Part>((s) => ({
      name: s < 0 ? "kol-sol" : "kol-sag",
      w: 0.12, h: 0.3, d: 0.68, r: 0.055,
      bulge: { y: 0.008, x: 0.006 },
      at: [s * (W / 2 - 0.06), seatTop + 0.15, 0.04],
    })),
    { name: "oturum", w: W - 0.25, h: 0.13, d: 0.66, r: 0.05, bulge: { y: 0.022, z: 0.008 }, at: [0, seatTop + 0.065, 0.06] },
    { name: "sirt", w: W, h: 0.64, d: 0.15, r: 0.075, bulge: { z: 0.018 }, rotX: -0.14, at: [0, seatTop + 0.3, -D / 2 + 0.1] },
    { name: "sirt-minder", w: W - 0.26, h: 0.44, d: 0.13, r: 0.06, bulge: { z: 0.03, y: 0.008 }, rotX: -0.16, at: [0, seatTop + 0.3, -0.2] },
  ];
  const group = buildParts(parts, fabric);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = taperedLeg(legH + 0.01, 0.017, 0.011, wood, x * 0.08);
      leg.rotation.x = -z * 0.08;
      leg.position.set(x * (W / 2 - 0.08), legH + 0.01, z * (D / 2 - 0.08));
      group.add(leg);
    }
  }
  group.name = "berjer";
  return group;
}

export const PROCEDURAL_BUILDERS = {
  "modular-sofa": createModularSofa,
  armchair: createArmchair,
} as const;
