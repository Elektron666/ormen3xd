import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildCodeModel } from "@/lib/three/procedural";
import { DEFAULTS } from "@/lib/parametric/spec";

/** Mean baked occlusion of a part's vertices whose root-space position passes the test. */
function meanAo(root: THREE.Object3D, name: string, where: (p: THREE.Vector3, n: THREE.Vector3) => boolean): number {
  root.updateMatrixWorld(true);
  let sum = 0;
  let count = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== name) return;
    const pos = o.geometry.getAttribute("position");
    const nor = o.geometry.getAttribute("normal");
    const col = o.geometry.getAttribute("color");
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const n = new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (!where(p, n)) continue;
      sum += col.getX(i);
      count++;
    }
  });
  return count ? sum / count : NaN;
}

describe("ezik gölgesi (ambient occlusion)", () => {
  it("koltuğun içe kapanan yerleri koyu, açık yüzeyleri aydınlık", () => {
    const t0 = performance.now();
    const sofa = buildCodeModel({ kind: "parametric", params: DEFAULTS.uclu });
    const ms = performance.now() - t0;
    // the middle of a seat's top is open; the seat's side facing the next seat is shut in
    const openTop = meanAo(sofa, "oturum", (p, n) => n.y > 0.9 && Math.abs(p.x) < 0.15 && p.z > 0.1);
    const between = meanAo(sofa, "oturum", (p, n) => Math.abs(n.x) > 0.9 && Math.abs(p.x) > 0.2 && Math.abs(p.x) < 0.5);
    expect(openTop).toBeGreaterThan(0.9);
    expect(between).toBeLessThan(0.7);
    expect(ms).toBeLessThan(3000);
  });

  it("tüm kodla çizilen modellerde var, dosyadan gelen modele dokunmaz", () => {
    const chair = buildCodeModel({ kind: "procedural", generator: "armchair" });
    let marked = 0;
    chair.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry.userData.ao) marked++;
    });
    expect(marked).toBeGreaterThan(3);
    const values: number[] = [];
    chair.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry.userData.ao) {
        const c = o.geometry.getAttribute("color");
        for (let i = 0; i < c.count; i++) values.push(c.getX(i));
      }
    });
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.419);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });
});
