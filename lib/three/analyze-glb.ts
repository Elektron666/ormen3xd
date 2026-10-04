import * as THREE from "three";
import { prepareModel } from "./prepare-model";

// Reads an uploaded .glb in the browser: which materials it has (so ORMEN can
// tick the ones that take the fabric) and how big it is.

export const GLB_WARN_MB = 15;
export const GLB_MAX_MB = 60;

export interface GlbMaterial {
  name: string;
  meshes: number;
  /** False when a mesh using it has no UV coordinates (fabric cannot be laid on it). */
  hasUv: boolean;
  suggested: boolean;
}

export interface GlbReport {
  scene: THREE.Object3D;
  materials: GlbMaterial[];
  sizeCm: { w: number; d: number; h: number };
  triangles: number;
  problems: string[];
  warnings: string[];
}

const FABRIC_HINT = /kuma[sş]|fabric|cloth|textile|uphol|d[oö][sş]eme|minder|cushion|seat|oturum|sirt|sırt|kol|arm|back/i;
const NOT_FABRIC = /leg|ayak|wood|ah[sş]ap|metal|chrome|krom|plastic|glass|cam|base|kaide|zemin|floor/i;

/** Guess from the name whether a material is upholstered. */
export function looksLikeFabric(name: string): boolean {
  return FABRIC_HINT.test(name) && !NOT_FABRIC.test(name);
}

/** Sanity checks on the measured size (the file must be modelled in metres). */
export function sizeProblems(cm: { w: number; d: number; h: number }): string[] {
  const max = Math.max(cm.w, cm.d, cm.h);
  if (!Number.isFinite(max) || max <= 0) return ["Modelde görünür bir parça bulunamadı."];
  if (max > 1500) return [`Model ${Math.round(max / 100)} m büyüklüğünde görünüyor; dosya büyük olasılıkla milimetre ya da santimetre ile kaydedilmiş. Metre birimiyle dışa aktarın.`];
  if (max < 10) return [`Model ${max.toFixed(1)} cm büyüklüğünde görünüyor; birim yanlış olabilir. Metre birimiyle dışa aktarın.`];
  return [];
}

export function analyseScene(scene: THREE.Object3D, fileBytes: number): GlbReport {
  scene.updateMatrixWorld(true);
  const byName = new Map<string, GlbMaterial>();
  let triangles = 0;
  let unnamed = 0;
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    triangles += (geo.index ? geo.index.count : geo.getAttribute("position").count) / 3;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m.name) {
        unnamed++;
        continue;
      }
      const entry = byName.get(m.name) ?? { name: m.name, meshes: 0, hasUv: true, suggested: looksLikeFabric(m.name) };
      entry.meshes++;
      if (!geo.getAttribute("uv")) entry.hasUv = false;
      byName.set(m.name, entry);
    }
  });
  const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
  const sizeCm = { w: Math.round(size.x * 100), d: Math.round(size.z * 100), h: Math.round(size.y * 100) };
  const problems = sizeProblems(sizeCm);
  if (byName.size === 0) problems.push("Modeldeki malzemelerin adı yok. Kumaş alacak parçalara modelleme programında bir malzeme adı verin (ör. “kumas”).");
  const warnings: string[] = [];
  const mb = fileBytes / 1024 / 1024;
  if (mb > GLB_WARN_MB) warnings.push(`Dosya ${mb.toFixed(1)} MB. ${GLB_WARN_MB} MB üstü modeller telefonda yavaş açılır; mümkünse Draco sıkıştırmasıyla dışa aktarın.`);
  if (triangles > 400_000) warnings.push(`${Math.round(triangles / 1000)} bin üçgen var; 200 binin altı önerilir.`);
  if (unnamed > 0) warnings.push(`${unnamed} parçanın malzemesinin adı yok; bunlara kumaş giydirilemez.`);
  const materials = [...byName.values()].sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.name.localeCompare(b.name, "tr"));
  return { scene, materials, sizeCm, triangles: Math.round(triangles), problems, warnings };
}

/** Above this, the fabric visibly changes scale from one part of a piece to another. */
export const UV_SPREAD_LIMIT = 0.35;

/**
 * Per ticked material: how even its UV density is. Real-scale fabric relies
 * on it, so uneven UVs are reported in plain words.
 */
export function uvWarnings(scene: THREE.Object3D, materialNames: string[]): string[] {
  if (!materialNames.length) return [];
  const { slots } = prepareModel(scene, materialNames);
  const worst = new Map<string, number>();
  for (const s of slots) {
    const m = s.mesh.material;
    const name = (Array.isArray(m) ? m[s.materialIndex] : m).name;
    if (Number.isFinite(s.uvSpread)) worst.set(name, Math.max(worst.get(name) ?? 0, s.uvSpread));
  }
  return [...worst]
    .filter(([, v]) => v > UV_SPREAD_LIMIT)
    .map(
      ([n, v]) =>
        `“${n}” malzemesinde UV ölçüsü parçadan parçaya %${Math.round(v * 100)} değişiyor; kumaş bazı yerlerde büyük, bazı yerlerde küçük görünebilir. Modelciden UV’leri eşit ölçekte açmasını isteyin.`,
    );
}

/** Parses a .glb file (Draco supported, decoder served from /draco/). */
export async function analyseGlb(file: Blob): Promise<GlbReport> {
  const mb = file.size / 1024 / 1024;
  if (mb > GLB_MAX_MB) throw new Error(`Dosya ${mb.toFixed(0)} MB; en fazla ${GLB_MAX_MB} MB yüklenebilir.`);
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("three/examples/jsm/loaders/DRACOLoader.js")]);
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  try {
    const buf = await file.arrayBuffer();
    const gltf = await loader.parseAsync(buf, "");
    return analyseScene(gltf.scene, file.size);
  } catch (e) {
    throw new Error(`Dosya okunamadı. .glb (glTF 2.0 ikili) biçiminde olmalı.${e instanceof Error && e.message ? ` (${e.message})` : ""}`);
  } finally {
    draco.dispose();
  }
}
