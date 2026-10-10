import * as THREE from "three";
import { WOOD_MATERIAL } from "./constants";
import { DEFAULT_LEG, LEG_COLORS, type LegFinish } from "./legs";

/** Colours the wooden parts of a model built from code (one wood material per build). */
export function paintLegs(root: THREE.Object3D, finish: LegFinish | undefined): void {
  const color = new THREE.Color(LEG_COLORS[finish ?? DEFAULT_LEG]);
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
    if ((o as THREE.Mesh).isMesh && m && !Array.isArray(m) && m.name === WOOD_MATERIAL) m.color.copy(color);
  });
}
