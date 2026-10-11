import * as THREE from "three";
import { LAYER_COMPARE, LAYER_PRIMARY } from "./constants";

// Ar-Ge A5 (ARGE.md): the piping broke up on phones. Half of its cord sits
// inside the cushion, so the cushion and the cord meet in a thin seam that the
// depth buffer must tell apart. A phone may give 16 bits of depth where a
// desktop gives 24, and depth resolution goes as distance² / (near × 2^bits):
// with the near plane at 5 cm and the camera 4 m away, 16 bits resolve only
// ~5 mm, about the cord's own size. Moving the near plane out to half the
// distance to the nearest furniture (at most 50 cm) buys ten times that,
// without ever cutting into the furniture.

export const NEAR = { min: 0.02, max: 0.5, share: 0.5 } as const;

/** The near plane for a camera this far (metres) from the nearest furniture. */
export function nearPlane(distanceToFurniture: number): number {
  return Math.min(NEAR.max, Math.max(NEAR.min, distanceToFurniture * NEAR.share));
}

const FURNITURE_MASK = (1 << LAYER_PRIMARY) | (1 << LAYER_COMPARE);
const tmp = new THREE.Box3();

/** World bounds of every furniture mesh in the scene (empty when there is none). */
export function furnitureBox(scene: THREE.Object3D, out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.layers.mask & FURNITURE_MASK) || !m.visible) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    out.union(tmp.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld));
  });
  return out;
}
