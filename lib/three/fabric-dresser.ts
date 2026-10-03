import * as THREE from "three";
import type { Fabric, TextureSize } from "@/lib/types";
import { textureRepeat } from "@/lib/fabric/scale";
import { createFabricMaterial, disposeFabricMaterial, loadFabricTextures } from "./fabric-material";
import type { FabricSlot } from "./prepare-model";

const FADE_SECONDS = 0.32;

interface Fade {
  overlays: { slot: FabricSlot; overlay: THREE.Mesh; finalMat: THREE.MeshPhysicalMaterial }[];
  t: number;
  previous: Set<THREE.Material>;
}

/**
 * Dresses a prepared model in a fabric.
 *
 * - The previous fabric stays on screen until the new textures are loaded;
 *   the model is never shown grey or empty.
 * - The new fabric fades in over the old one with a transparent overlay of
 *   the same geometry, then replaces it.
 * - Rapid selections are coalesced: only the latest request is applied.
 */
export class FabricDresser {
  private request = 0;
  private fade: Fade | null = null;
  private current = new Set<THREE.Material>();
  currentCode: string | null = null;

  constructor(
    private root: THREE.Object3D,
    private slots: FabricSlot[],
  ) {}

  /** Hidden until the first fabric is on, so a bare model is never shown. */
  setVisible(visible: boolean) {
    this.root.visible = visible;
  }

  get animating(): boolean {
    return this.fade !== null;
  }

  /** Resolves true when this fabric was applied, false when superseded. */
  async apply(fabric: Fabric, size: TextureSize, opts: { instant?: boolean } = {}): Promise<boolean> {
    const id = ++this.request;
    const tex = await loadFabricTextures(fabric, size);
    if (id !== this.request) return false;
    this.finishFade();

    const byRepeat = new Map<string, THREE.MeshPhysicalMaterial>();
    const materialFor = (slot: FabricSlot) => {
      const cmPerUv = Number.isFinite(slot.cmPerUv) ? slot.cmPerUv : 100;
      const rep = textureRepeat(cmPerUv, fabric.texture.repeatCm);
      const key = `${rep.x.toFixed(3)}:${rep.y.toFixed(3)}`;
      let mat = byRepeat.get(key);
      if (!mat) {
        mat = createFabricMaterial(fabric, tex, new THREE.Vector2(rep.x, rep.y));
        byRepeat.set(key, mat);
      }
      return mat;
    };

    const previous = this.current;
    this.current = new Set();
    const instant = opts.instant || previous.size === 0;

    if (instant) {
      for (const slot of this.slots) this.setSlotMaterial(slot, materialFor(slot));
      for (const m of previous) disposeFabricMaterial(m as THREE.MeshPhysicalMaterial);
    } else {
      const overlays: Fade["overlays"] = [];
      for (const slot of this.slots) {
        const finalMat = materialFor(slot);
        this.current.add(finalMat);
        if (slot.materialIndex >= 0) {
          // multi-material mesh: no overlay, swap directly
          this.setSlotMaterial(slot, finalMat);
          continue;
        }
        const fadeMat = finalMat.clone();
        fadeMat.transparent = true;
        fadeMat.opacity = 0;
        fadeMat.depthWrite = false;
        const overlay = new THREE.Mesh(slot.mesh.geometry, fadeMat);
        overlay.name = "kumas-gecis";
        overlay.renderOrder = 1;
        slot.mesh.add(overlay);
        overlays.push({ slot, overlay, finalMat });
      }
      this.fade = { overlays, t: 0, previous };
    }
    this.currentCode = fabric.code;
    return true;
  }

  /** Advances the cross-fade; returns true while another frame is needed. */
  tick(delta: number): boolean {
    const fade = this.fade;
    if (!fade) return false;
    fade.t += delta / FADE_SECONDS;
    const k = Math.min(1, fade.t);
    const eased = k * k * (3 - 2 * k);
    for (const o of fade.overlays) (o.overlay.material as THREE.Material).opacity = eased;
    if (k >= 1) this.finishFade();
    return this.fade !== null;
  }

  private finishFade() {
    const fade = this.fade;
    if (!fade) return;
    for (const o of fade.overlays) {
      this.setSlotMaterial(o.slot, o.finalMat);
      o.slot.mesh.remove(o.overlay);
      (o.overlay.material as THREE.Material).dispose();
    }
    for (const m of fade.previous) if (!this.current.has(m)) disposeFabricMaterial(m as THREE.MeshPhysicalMaterial);
    this.fade = null;
  }

  private setSlotMaterial(slot: FabricSlot, mat: THREE.MeshPhysicalMaterial) {
    this.current.add(mat);
    if (slot.materialIndex >= 0 && Array.isArray(slot.mesh.material)) {
      slot.mesh.material[slot.materialIndex] = mat;
    } else {
      slot.mesh.material = mat;
    }
  }

  /** Cancels pending loads and frees materials. The dresser stays usable. */
  dispose() {
    this.request++;
    this.finishFade();
    for (const m of this.current) disposeFabricMaterial(m as THREE.MeshPhysicalMaterial);
    this.current.clear();
    this.currentCode = null;
  }
}
