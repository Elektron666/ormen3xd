import * as THREE from "three";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { textureRepeat } from "@/lib/fabric/scale";
import { prepareModel, type PreparedModel } from "@/lib/three/prepare-model";
import { createFabricMaterial, type FabricTextures } from "@/lib/three/fabric-material";

// AR export: one piece of furniture, dressed in one fabric, as a standalone
// .glb the phone's AR viewer can place in the room at real size.
//
// The fabric's real-size repeat is BAKED INTO THE UVs (texture repeat = 1).
// AR viewers handle texture transforms unevenly (iOS Quick Look converts to
// USDZ), plain UVs survive every conversion.

/**
 * Scales the UVs of the given vertex range by the repeat (the caller makes
 * the geometry non-indexed when ranges of different materials could share a vertex).
 */
export function bakeRepeat(geo: THREE.BufferGeometry, start: number, count: number, repeat: { x: number; y: number }): void {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute | undefined;
  if (!uv) return;
  const end = Math.min(uv.count, start + count);
  for (let i = start; i < end; i++) uv.setXY(i, uv.getX(i) * repeat.x, uv.getY(i) * repeat.y);
  uv.needsUpdate = true;
}

function plainTexture(t: THREE.Texture | null, mime: string): THREE.Texture | null {
  if (!t) return null;
  const c = t.clone();
  c.repeat.set(1, 1);
  c.offset.set(0, 0);
  // GLTFExporter re-encodes images; JPEG keeps a phone download small
  c.userData = { ...c.userData, mimeType: mime };
  c.needsUpdate = true;
  return c;
}

/** Fabric material for AR: same look, repeat 1 (it lives in the UVs). */
function arMaterial(fabric: Fabric, tex: FabricTextures): THREE.MeshPhysicalMaterial {
  const m = createFabricMaterial(fabric, tex, new THREE.Vector2(1, 1));
  m.map = plainTexture(m.map, "image/jpeg");
  m.normalMap = plainTexture(m.normalMap, "image/jpeg");
  m.roughnessMap = plainTexture(m.roughnessMap, "image/jpeg");
  return m;
}

/**
 * Builds the AR scene from a model source (procedural group or loaded glTF
 * scene): placed on the floor, centred, fabric applied with baked repeat.
 * Geometries are copied, the source is left untouched.
 */
export function buildArScene(source: THREE.Object3D, model: FurnitureModel, fabric: Fabric, tex: FabricTextures): PreparedModel {
  const prepared = prepareModel(source, model.fabricMaterialNames);
  const material = arMaterial(fabric, tex);
  const done = new Map<THREE.Mesh, THREE.BufferGeometry>();

  for (const slot of prepared.slots) {
    const mesh = slot.mesh;
    let geo = done.get(mesh);
    if (!geo) {
      // a mesh mixing materials gets a non-indexed copy so its ranges never
      // share a vertex; otherwise the index is kept (3× smaller file)
      geo = slot.materialIndex >= 0 && mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      mesh.geometry = geo;
      // materials are shared with the source; give this mesh its own list
      mesh.material = Array.isArray(mesh.material) ? [...mesh.material] : mesh.material;
      done.set(mesh, geo);
    }
    const cmPerUv = Number.isFinite(slot.cmPerUv) ? slot.cmPerUv : 100;
    const rep = textureRepeat(cmPerUv, fabric.texture.repeatCm);
    if (slot.materialIndex >= 0) {
      for (const g of geo.groups) if (g.materialIndex === slot.materialIndex) bakeRepeat(geo, g.start, g.count, rep);
      (mesh.material as THREE.Material[])[slot.materialIndex] = material;
    } else {
      bakeRepeat(geo, 0, Infinity, rep);
      mesh.material = material;
    }
  }
  prepared.root.name = `${model.slug}-${fabric.code}`;
  return prepared;
}

/** Binary glTF of the AR scene (browser only: textures are drawn to a canvas). */
export async function exportGlb(root: THREE.Object3D): Promise<Blob> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const out = await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: 1024, onlyVisible: true });
  return new Blob([out as ArrayBuffer], { type: "model/gltf-binary" });
}

/** Loads the raw model (procedural or .glb) in the browser. */
async function loadSource(model: FurnitureModel): Promise<THREE.Object3D> {
  const src = model.source;
  if (src.kind === "procedural") {
    const { PROCEDURAL_BUILDERS } = await import("@/lib/three/procedural/furniture");
    return PROCEDURAL_BUILDERS[src.generator]();
  }
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/loaders/DRACOLoader.js")]);
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  try {
    return (await new GLTFLoader().setDRACOLoader(draco).loadAsync(src.url)).scene;
  } finally {
    draco.dispose();
  }
}

const glbCache = new Map<string, Promise<Blob>>();

/** The AR file for a model in a fabric (built once per pair and kept for the visit). */
export function arGlb(model: FurnitureModel, fabric: Fabric): Promise<Blob> {
  const key = `${model.id}:${fabric.id}:${fabric.texture.maps.albedo["1k"]}`;
  let entry = glbCache.get(key);
  if (!entry) {
    entry = (async () => {
      const { loadFabricTextures } = await import("@/lib/three/fabric-material");
      const [source, tex] = await Promise.all([loadSource(model), loadFabricTextures(fabric, "1k")]);
      return exportGlb(buildArScene(source, model, fabric, tex).root);
    })();
    entry.catch(() => glbCache.delete(key));
    glbCache.set(key, entry);
  }
  return entry;
}
