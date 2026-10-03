// Real-world texture scale.
//
// A texture tile has a known physical size (repeatCm). To show it at true scale
// we need to know how many centimetres of surface one UV unit covers on a given
// mesh. That ratio ("UV density") is measured from the geometry itself:
//
//   cmPerUv = sqrt( Σ world triangle area (cm²) / Σ UV triangle area )
//
// and the texture repeat is cmPerUv / repeatCm. Measuring per mesh makes the
// result independent of how the modeller laid out the UVs, as long as the UVs
// are roughly uniform within one mesh (checked by uvDensitySpread).

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface UvDensityInput {
  /** Flat xyz positions already transformed to world space, in metres. */
  positions: ArrayLike<number>;
  /** Flat uv pairs. */
  uvs: ArrayLike<number>;
  /** Triangle indices; when absent vertices are consumed in triples. */
  index?: ArrayLike<number> | null;
}

export interface UvDensity {
  /** Centimetres of surface per 1 UV unit. NaN when the mesh has no usable UVs. */
  cmPerUv: number;
  /**
   * Relative spread of per-triangle density (area-weighted std / mean).
   * Above ~0.35 the UV layout is too uneven for a single repeat value.
   */
  spread: number;
}

function triArea3(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  return 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
}

function triArea2(au: number, av: number, bu: number, bv: number, cu: number, cv: number): number {
  return 0.5 * Math.abs((bu - au) * (cv - av) - (cu - au) * (bv - av));
}

export function measureUvDensity({ positions, uvs, index }: UvDensityInput): UvDensity {
  const triCount = index ? Math.floor(index.length / 3) : Math.floor(positions.length / 9);
  let worldSum = 0;
  let uvSum = 0;
  const samples: { d: number; w: number }[] = [];

  for (let t = 0; t < triCount; t++) {
    const a = index ? index[t * 3] : t * 3;
    const b = index ? index[t * 3 + 1] : t * 3 + 1;
    const c = index ? index[t * 3 + 2] : t * 3 + 2;
    const wa = triArea3(
      positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2],
      positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2],
      positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2],
    ) * 10000; // m² → cm²
    const ua = triArea2(uvs[a * 2], uvs[a * 2 + 1], uvs[b * 2], uvs[b * 2 + 1], uvs[c * 2], uvs[c * 2 + 1]);
    if (wa <= 1e-9 || ua <= 1e-12) continue;
    worldSum += wa;
    uvSum += ua;
    samples.push({ d: Math.sqrt(wa / ua), w: wa });
  }

  if (uvSum <= 0) return { cmPerUv: NaN, spread: NaN };
  const cmPerUv = Math.sqrt(worldSum / uvSum);

  let variance = 0;
  for (const s of samples) variance += s.w * (s.d - cmPerUv) ** 2;
  const spread = Math.sqrt(variance / worldSum) / cmPerUv;
  return { cmPerUv, spread };
}

/** Texture repeat (tiles per UV unit) that shows a tile of repeatCm at true size. */
export function textureRepeat(cmPerUv: number, repeatCm: { w: number; h: number }): { x: number; y: number } {
  return { x: cmPerUv / repeatCm.w, y: cmPerUv / repeatCm.h };
}

export const UV_SPREAD_WARNING = 0.35;
