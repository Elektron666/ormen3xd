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

type Axis = 0 | 1 | 2;

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
        uvs.push(f.us * su.arc[i], f.vs * sv.arc[j]);
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
