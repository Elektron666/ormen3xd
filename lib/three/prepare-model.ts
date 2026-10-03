import * as THREE from "three";
import { measureUvDensity } from "@/lib/fabric/scale";

export interface FabricSlot {
  mesh: THREE.Mesh;
  /** Index in mesh.material when the mesh has several materials, otherwise -1. */
  materialIndex: number;
  cmPerUv: number;
  uvSpread: number;
}

export interface PreparedModel {
  root: THREE.Group;
  slots: FabricSlot[];
  /** Bounding box size in metres. */
  size: THREE.Vector3;
}

function materialName(m: THREE.Material | THREE.Material[], i: number): string {
  return Array.isArray(m) ? m[i]?.name ?? "" : m.name;
}

/**
 * Returns a copy of the model placed on the floor (min y = 0), centres it on x/z, and finds the
 * meshes that take the fabric, measuring the UV density of each so textures
 * can be shown at real size.
 */
export function prepareModel(original: THREE.Object3D, fabricMaterialNames: string[]): PreparedModel {
  // Work on a clone (geometry and materials are shared, not copied) so the
  // input is never mutated and the function is safe to call more than once.
  const source = original.clone(true);
  const root = new THREE.Group();
  root.add(source);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(source);
  const center = box.getCenter(new THREE.Vector3());
  source.position.x -= center.x;
  source.position.z -= center.z;
  source.position.y -= box.min.y;
  root.updateMatrixWorld(true);

  const names = new Set(fabricMaterialNames);
  const slots: FabricSlot[] = [];
  const tmp = new THREE.Vector3();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((_, i) => {
      if (!names.has(materialName(mesh.material, i))) return;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      const uv = geo.getAttribute("uv");
      if (!pos || !uv) return;
      const world = new Float32Array(pos.count * 3);
      for (let k = 0; k < pos.count; k++) {
        tmp.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld);
        world[k * 3] = tmp.x;
        world[k * 3 + 1] = tmp.y;
        world[k * 3 + 2] = tmp.z;
      }
      const uvs = new Float32Array(uv.count * 2);
      for (let k = 0; k < uv.count; k++) {
        uvs[k * 2] = uv.getX(k);
        uvs[k * 2 + 1] = uv.getY(k);
      }
      const { cmPerUv, spread } = measureUvDensity({
        positions: world,
        uvs,
        index: geo.index ? (geo.index.array as ArrayLike<number>) : null,
      });
      slots.push({ mesh, materialIndex: Array.isArray(mesh.material) ? i : -1, cmPerUv, uvSpread: spread });
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { root, slots, size };
}
