import * as THREE from "three";

// Upholstered "cushion" primitive: a rounded box with optional pillow bulge.
//
// UVs are laid out in metres (1 UV unit = 1 m of surface) using arc length
// across the rounded edges, so fabric textures land at true scale and stay
// continuous over each edge. Each of the six sides is its own UV island, much
// like the panels of a real upholstered piece.

export interface CushionOptions {
  /** Size in metres: width (x), height (y), depth (z). */
  w: number;
  h: number;
  d: number;
  /** Edge radius in metres. */
  r: number;
  /** Pillow bulge per axis in metres, applied to both faces of that axis. */
  bulge?: { x?: number; y?: number; z?: number };
  /** Target segment length on flat parts, metres. */
  step?: number;
  /** Segments per rounded edge (each side of the 45° seam). */
  arcSegments?: number;
  /**
   * Button tufting (kapitone) on the front face (+z): dimples on a diamond
   * grid, `spacing` apart, `depth` deep, kept `spacing / 2` inside the edges.
   */
  tufts?: { spacing: number; depth: number };
  /**
   * The axis the fabric is wrapped around, as an upholsterer does: one
   * continuous strip over front, top, back and bottom, with the two end
   * panels continuing round the corners. 0 (x, default): seats, backs,
   * bodies; 2 (z): arms, where the fabric runs from the outside over the
   * top to the inside. Without this every face started the pattern afresh
   * and stripes broke at each edge.
   */
  wrap?: 0 | 2;
}

/**
 * UV (metres) of a point on a rounded box, given its arc-length coordinates
 * on the two axes in its face. Faces round the wrap axis share one running
 * v; the end panels take u on from the front's edge.
 */
function wrapUv(n: Axis, s: 1 | -1, arc: number[], H: number[], wrap: 0 | 2): [number, number] {
  const A = wrap;
  const D: Axis = wrap === 0 ? 2 : 0; // the "front" face is +D
  // keep the pattern the right way round seen from the front face
  const su = wrap === 0 ? 1 : -1;
  if (n === D)
    return s > 0 ? [su * arc[A], arc[1]] : [su * arc[A], H[1] + 2 * H[D] + (H[1] - arc[1])];
  if (n === 1) return s > 0 ? [su * arc[A], H[1] + (H[D] - arc[D])] : [su * arc[A], -H[1] - (H[D] - arc[D])];
  // end panels: across the corner from the front, rows level with the front's
  return [su * s * (H[A] + (H[D] - arc[D])), arc[1]];
}

/** Button points of a diamond grid inside a w × h face, centred. */
export function tuftPoints(w: number, h: number, spacing: number): [number, number][] {
  const rowStep = spacing * 0.75;
  const xMax = w / 2 - spacing / 2;
  const yMax = h / 2 - spacing / 2;
  if (xMax < 0 || yMax < 0) return [];
  const rows = Math.max(1, Math.floor((2 * yMax) / rowStep) + 1);
  const y0 = -((rows - 1) * rowStep) / 2;
  const pts: [number, number][] = [];
  for (let j = 0; j < rows; j++) {
    const offset = j % 2 ? spacing / 2 : 0;
    const cols = Math.floor((2 * xMax - offset) / spacing) + 1;
    const x0 = -((cols - 1) * spacing) / 2;
    for (let i = 0; i < cols; i++) pts.push([x0 + i * spacing, y0 + j * rowStep]);
  }
  return pts;
}

export type Axis = 0 | 1 | 2;

interface AxisSamples {
  /** Box-space coordinate fed to the rounding map. */
  pos: number[];
  /** Arc-length coordinate, used for UVs. */
  arc: number[];
}

function sampleAxis(half: number, r: number, step: number, arcSegs: number): AxisSamples {
  const flat = Math.max(0, half - r);
  const flatSegs = Math.max(1, Math.ceil((2 * flat) / step));
  const pos: number[] = [];
  const arc: number[] = [];
  // negative arc: from -45° to 0
  for (let k = arcSegs; k > 0; k--) {
    const phi = (k / arcSegs) * (Math.PI / 4);
    pos.push(-(flat + r * Math.tan(phi)));
    arc.push(-(flat + r * phi));
  }
  for (let k = 0; k <= flatSegs; k++) {
    const p = -flat + (2 * flat * k) / flatSegs;
    pos.push(p);
    arc.push(p);
  }
  for (let k = 1; k <= arcSegs; k++) {
    const phi = (k / arcSegs) * (Math.PI / 4);
    pos.push(flat + r * Math.tan(phi));
    arc.push(flat + r * phi);
  }
  return { pos, arc };
}

// For each face: normal axis, sign, and which axes/signs drive u and v.
const FACES: { n: Axis; s: 1 | -1; u: Axis; us: 1 | -1; v: Axis; vs: 1 | -1 }[] = [
  { n: 2, s: 1, u: 0, us: 1, v: 1, vs: 1 }, // front
  { n: 2, s: -1, u: 0, us: -1, v: 1, vs: 1 }, // back
  { n: 0, s: 1, u: 2, us: -1, v: 1, vs: 1 }, // right
  { n: 0, s: -1, u: 2, us: 1, v: 1, vs: 1 }, // left
  { n: 1, s: 1, u: 0, us: 1, v: 2, vs: -1 }, // top
  { n: 1, s: -1, u: 0, us: 1, v: 2, vs: 1 }, // bottom
];

export function createCushionGeometry(o: CushionOptions): THREE.BufferGeometry {
  const half = [o.w / 2, o.h / 2, o.d / 2];
  const r = Math.min(o.r, ...half.map((v) => v * 0.98));
  // dimples need a finer mesh than a plain pillow
  const step = o.step ?? (o.tufts ? 0.012 : 0.04);
  const buttons = o.tufts ? tuftPoints(o.w, o.h, o.tufts.spacing) : [];
  const sigma = o.tufts ? o.tufts.spacing * 0.16 : 0;
  const arcSegs = o.arcSegments ?? 6;
  const samples = half.map((hv) => sampleAxis(hv, r, step, arcSegs));
  const bulge = [o.bulge?.x ?? 0, o.bulge?.y ?? 0, o.bulge?.z ?? 0];
  const inner = half.map((hv) => Math.max(0, hv - r));

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const p = [0, 0, 0];

  const H = samples.map((a) => a.arc[a.arc.length - 1]);
  const arcAt = [0, 0, 0];
  for (const f of FACES) {
    const su = samples[f.u];
    const sv = samples[f.v];
    const base = positions.length / 3;
    const nu = su.pos.length;
    const nv = sv.pos.length;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        p[f.n] = f.s * half[f.n];
        p[f.u] = su.pos[i];
        p[f.v] = sv.pos[j];
        // rounded box: push the point out from the inner box by r
        const c = [0, 1, 2].map((a) => Math.min(inner[a], Math.max(-inner[a], p[a])));
        const dir = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
        const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
        const q = [c[0] + (dir[0] / len) * r, c[1] + (dir[1] / len) * r, c[2] + (dir[2] / len) * r];
        // pillow bulge, zero at the 45° seams
        if (bulge[f.n] !== 0) {
          const a = p[f.u] / half[f.u];
          const b = p[f.v] / half[f.v];
          q[f.n] += f.s * bulge[f.n] * (1 - a * a) * (1 - b * b);
        }
        if (buttons.length && f.n === 2 && f.s === 1) {
          // each button pulls the face in; overlapping pulls do not add up past one button's depth
          let pull = 0;
          for (const [bx, by] of buttons) pull = Math.max(pull, Math.exp(-((q[0] - bx) ** 2 + (q[1] - by) ** 2) / (2 * sigma * sigma)));
          q[2] -= o.tufts!.depth * pull;
        }
        positions.push(q[0], q[1], q[2]);
        arcAt[f.u] = su.arc[i];
        arcAt[f.v] = sv.arc[j];
        uvs.push(...wrapUv(f.n, f.s, arcAt, H, o.wrap ?? 0));
      }
    }
    // orient triangles outward
    const test = (() => {
      const a = new THREE.Vector3(...positions.slice(base * 3, base * 3 + 3));
      const b = new THREE.Vector3(...positions.slice((base + 1) * 3, (base + 1) * 3 + 3));
      const c = new THREE.Vector3(...positions.slice((base + nu) * 3, (base + nu) * 3 + 3));
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const out = [0, 0, 0];
      out[f.n] = f.s;
      return n.dot(new THREE.Vector3(...out)) > 0;
    })();
    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < nu - 1; i++) {
        const a = base + j * nu + i;
        const b = a + 1;
        const c = a + nu;
        const d = c + 1;
        if (test) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  smoothNormalsAcrossSeams(g);
  return g;
}

/** Averages normals of vertices that share a position (UV seams), removing creases. */
export function smoothNormalsAcrossSeams(g: THREE.BufferGeometry): void {
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const n = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of list) n.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)));
    n.normalize();
    for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
}

/**
 * Piping (biye) along the seam around one face of a cushion: the face whose
 * normal is `axis` with `sign`. The seam is where the cushion's sides meet
 * that face (the 45° line of the rounded edges); the pillow bulge is zero
 * there, so the cord sits exactly on the surface. UVs are in metres (along
 * the cord, around it), like the cushion's, so the fabric keeps its scale.
 */
export function createWeltGeometry(o: CushionOptions, axis: Axis, sign: 1 | -1, cord = 0.0045): THREE.BufferGeometry {
  const half = [o.w / 2, o.h / 2, o.d / 2];
  const r = Math.min(o.r, ...half.map((v) => v * 0.98));
  const inner = half.map((hv) => Math.max(0, hv - r));
  const [u, v] = ([0, 1, 2] as Axis[]).filter((a) => a !== axis);
  // the face's outline in box space (before rounding): a rectangle at the far end of its samples
  const hu = inner[u] + r;
  const hv = inner[v] + r;
  const corners: [number, number][] = [
    [hu, hv],
    [-hu, hv],
    [-hu, -hv],
    [hu, -hv],
  ];
  const pts: THREE.Vector3[] = [];
  const step = 0.01;
  for (let k = 0; k < 4; k++) {
    const [u0, v0] = corners[k];
    const [u1, v1] = corners[(k + 1) % 4];
    const len = Math.hypot(u1 - u0, v1 - v0);
    const n = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // sample densely near the rectangle's corners, where the rounding bends the line most
      const e = t < 0.5 ? 0.5 * (2 * t) ** 1.6 : 1 - 0.5 * (2 - 2 * t) ** 1.6;
      const p = [0, 0, 0];
      p[axis] = sign * (inner[axis] + r);
      p[u] = u0 + (u1 - u0) * e;
      p[v] = v0 + (v1 - v0) * e;
      const c = [0, 1, 2].map((a) => Math.min(inner[a], Math.max(-inner[a], p[a])));
      const dir = new THREE.Vector3(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
      dir.normalize();
      pts.push(new THREE.Vector3(c[0], c[1], c[2]).addScaledVector(dir, r));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  const length = curve.getLength();
  // a cord this thin needs few sides; along it, one ring per 1.5 cm still follows the corners
  const g = new THREE.TubeGeometry(curve, Math.ceil(length / 0.015), cord, 6, true);
  // TubeGeometry's UVs run 0..1 along and around; turn them into metres
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * length, uv.getY(i) * 2 * Math.PI * cord);
  return g;
}
