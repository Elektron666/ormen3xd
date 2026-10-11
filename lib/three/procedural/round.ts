import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// A round pouf (yuvarlak puf), in metres, centred on its middle. Like the
// cushion primitive its UVs are in metres, so the fabric keeps its real
// scale: the top and bottom are cut flat (planar), the side is one band
// wrapped round (u along the circumference, v down the side). The rounded
// rim belongs to the side band; piping covers the seam between them.

export interface RoundOptions {
  /** Radius, m. */
  R: number;
  /** Height, m. */
  h: number;
  /** Rounding of the rims, m. */
  r: number;
  /** How much the top rises in the middle, m. */
  crown?: number;
  /** A covered button pulling the middle of the top in, m deep. */
  button?: number;
}

const SEGMENTS = 96;

/** Flat (planar UV) cap at height y, facing up (+1) or down (-1), with a crown and a button. */
function cap(o: RoundOptions, y: number, dir: 1 | -1): THREE.BufferGeometry {
  const rings = 18;
  const rIn = o.R - o.r;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const sigma = rIn * 0.12;
  for (let i = 0; i <= rings; i++) {
    const rad = (i / rings) * rIn;
    const t = rad / rIn;
    let dy = (o.crown ?? 0) * (1 - t * t);
    if (dir === 1 && o.button) dy -= o.button * Math.exp(-(rad * rad) / (2 * sigma * sigma));
    for (let k = 0; k <= SEGMENTS; k++) {
      const a = (k / SEGMENTS) * Math.PI * 2;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      pos.push(x, y + dir * dy, z);
      uv.push(x, z);
    }
  }
  const row = SEGMENTS + 1;
  for (let i = 0; i < rings; i++)
    for (let k = 0; k < SEGMENTS; k++) {
      const a = i * row + k;
      const b = a + row;
      // outward: up for the top, down for the bottom
      if (dir === 1) idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The side band with both rounded rims: a profile turned round the vertical axis. */
function side(o: RoundOptions): THREE.BufferGeometry {
  const { R, h, r } = o;
  const profile: [number, number][] = [];
  const arc = 8;
  // top rim: from the cap's edge (horizontal) down to the wall (vertical)
  for (let i = 0; i <= arc; i++) {
    const a = (i / arc) * (Math.PI / 2);
    profile.push([R - r + Math.sin(a) * r, h / 2 - r + Math.cos(a) * r]);
  }
  // a slight belly on the wall, as a filled pouf has
  const wall = 10;
  for (let i = 1; i < wall; i++) {
    const t = i / wall;
    profile.push([R + 0.006 * Math.sin(Math.PI * t), h / 2 - r - t * (h - 2 * r)]);
  }
  for (let i = 0; i <= arc; i++) {
    const a = (i / arc) * (Math.PI / 2);
    profile.push([R - r + Math.cos(a) * r, -h / 2 + r - Math.sin(a) * r]);
  }
  // arc length down the profile: v in metres
  const vAt = [0];
  for (let i = 1; i < profile.length; i++) vAt.push(vAt[i - 1] + Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]));

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < profile.length; j++) {
    const [rad, y] = profile[j];
    for (let k = 0; k <= SEGMENTS; k++) {
      const a = (k / SEGMENTS) * Math.PI * 2;
      pos.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
      uv.push(a * R, -vAt[j]);
    }
  }
  const row = SEGMENTS + 1;
  for (let j = 0; j < profile.length - 1; j++)
    for (let k = 0; k < SEGMENTS; k++) {
      const a = j * row + k;
      const b = a + row;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createRoundPoufGeometry(o: RoundOptions): THREE.BufferGeometry {
  const merged = mergeGeometries([cap(o, o.h / 2, 1), side(o), cap(o, -o.h / 2, -1)]);
  if (!merged) throw new Error("yuvarlak puf geometrisi birleştirilemedi");
  return merged;
}

/** Piping round a rim (top +1, bottom -1), half-way round its rounding; UVs in metres. */
export function createRoundWeltGeometry(o: RoundOptions, sign: 1 | -1, cord = 0.0045): THREE.BufferGeometry {
  const a = Math.PI / 4;
  const ring = o.R - o.r + Math.sin(a) * o.r;
  const g = new THREE.TorusGeometry(ring, cord, 6, SEGMENTS * 2);
  g.rotateX(Math.PI / 2);
  g.translate(0, sign * (o.h / 2 - o.r + Math.cos(a) * o.r), 0);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * ring, uv.getY(i) * 2 * Math.PI * cord);
  return g;
}
