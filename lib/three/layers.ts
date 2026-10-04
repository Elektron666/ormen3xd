import type * as THREE from "three";
import { LAYER_COMPARE, LAYER_PRIMARY } from "./constants";

/** Moves an object and all its descendants to a single layer. */
export function setObjectLayer(root: THREE.Object3D, layer: number): void {
  root.traverse((o) => o.layers.set(layer));
}

/** Layer 0 plus the primary furniture layer: the normal view. */
export function showPrimary(camera: THREE.Camera): void {
  camera.layers.set(0);
  camera.layers.enable(LAYER_PRIMARY);
}

export function enableAllLayers(camera: THREE.Camera): void {
  camera.layers.enableAll();
}

/** Draws the scene twice: primary furniture left of `split`, compare copy right of it. */
export function renderSplit(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: { width: number; height: number },
  split: number,
): void {
  const px = Math.round(size.width * split);
  gl.setScissorTest(true);
  showPrimary(camera);
  gl.setScissor(0, 0, px, size.height);
  gl.render(scene, camera);
  camera.layers.set(0);
  camera.layers.enable(LAYER_COMPARE);
  gl.setScissor(px, 0, size.width - px, size.height);
  gl.render(scene, camera);
  gl.setScissorTest(false);
  showPrimary(camera);
}
