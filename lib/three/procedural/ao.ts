import * as THREE from "three";

// Ambient occlusion baked into the vertices of a model built from code.
//
// Real upholstery darkens where it is shut in: between seat cushions, where
// the seat meets the arm and the back, under the seat front near the floor.
// Without that, a sofa reads as an inflated plastic toy however good the
// fabric photo is. Every upholstered part here is a rounded box, so the
// darkening can be computed exactly and cheaply from the boxes' distance
// functions (no extra library, no screen-space pass, nothing per frame).
//
// The result is a grey vertex colour that multiplies the fabric; the fabric
// material switches vertex colours on only for geometry marked `userData.ao`,
// so uploaded GLB models are untouched.

interface Occluder {
  /** Root space → the box's own space. */
  inv: THREE.Matrix4;
  half: THREE.Vector3;
  r: number;
  /** Root-space bounds, for skipping far-away boxes. */
  bounds: THREE.Box3;
}

/** Signed distance to a rounded box centred at the origin. */
function roundedBox(p: THREE.Vector3, half: THREE.Vector3, r: number): number {
  const qx = Math.abs(p.x) - (half.x - r);
  const qy = Math.abs(p.y) - (half.y - r);
  const qz = Math.abs(p.z) - (half.z - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qy, qz), 0) - r;
}

/** Sample distances along the normal, metres: from fabric creases to the gap under a seat. */
const STEPS = [0.012, 0.03, 0.06, 0.1, 0.16, 0.24];
/** How dark the most shut-in fabric gets (multiplier of the fabric colour). */
const FLOOR = 0.42;

/** Bakes occlusion of the root's upholstered parts (and the floor at y = 0) into their vertex colours. */
export function bakeAo(root: THREE.Object3D, opts: { floor?: boolean } = {}): void {
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const toRoot = (o: THREE.Object3D) => new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);

  const targets: THREE.Mesh[] = [];
  const occluders: Occluder[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    // piping and similar trims are darkened like the fabric under them but do not shade anything
    if (o.userData.aoTarget) return void targets.push(o);
    const c = o.userData.cushion as { w: number; h: number; d: number; r: number } | undefined;
    const box = o.geometry instanceof THREE.BoxGeometry ? o.geometry.parameters : null;
    const size = c ?? (box ? { w: box.width, h: box.height, d: box.depth, r: 0 } : null);
    if (!size) return;
    const m = toRoot(o);
    const half = new THREE.Vector3(size.w / 2, size.h / 2, size.d / 2);
    occluders.push({ inv: m.clone().invert(), half, r: Math.min(size.r, half.x, half.y, half.z), bounds: new THREE.Box3(half.clone().negate(), half.clone()).applyMatrix4(m) });
    if (c) targets.push(o);
  });

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const s = new THREE.Vector3();
  const local = new THREE.Vector3();
  const reach = STEPS[STEPS.length - 1] + 0.02;

  for (const mesh of targets) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute("position");
    const nor = geo.getAttribute("normal");
    const m = toRoot(mesh);
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const own = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute).applyMatrix4(m).expandByScalar(reach);
    const near = occluders.filter((o) => o.bounds.intersectsBox(own));
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m);
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      let occ = 0;
      let weight = 1;
      for (const h of STEPS) {
        s.copy(p).addScaledVector(n, h);
        let d = opts.floor === false ? Infinity : s.y;
        for (const o of near) {
          d = Math.min(d, roundedBox(local.copy(s).applyMatrix4(o.inv), o.half, o.r));
          if (d <= 0) break;
        }
        occ += Math.max(0, h - d) / h * weight;
        weight *= 0.8;
      }
      // occ is 0 in the open, ~3.7 fully enclosed; the curve lifts mild occlusion so creases read
      const ao = THREE.MathUtils.clamp(1 - (1 - FLOOR) * Math.min(1, occ / 1.5) ** 0.85, FLOOR, 1);
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = ao;
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.userData.ao = true;
  }
}
