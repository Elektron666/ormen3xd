// Generates placeholder floor textures (oak, walnut, micro-concrete,
// travertine) into public/seed/floors. Code-generated, no licences involved.
//
//   npx tsx scripts/generate-floors.ts [--force]

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { FLOORS, type FloorFinish } from "../lib/room/spec";
import { heightToNormal, hexToRgb, linearToSrgb, srgbToLinear } from "../lib/fabric/maps";
import { fbmTile, hash, mulberry, vnoise } from "./noise";

const N = 2048;
const PUBLIC = path.join(process.cwd(), "public");
const force = process.argv.includes("--force");

interface Maps {
  height: Float32Array; // mm
  lum: Float32Array; // linear multiplier, normalised to mean 1 later
  rough: Float32Array;
}

function planks(f: FloorFinish, seed: number, contrast: number): Maps {
  const pxPerM = N / f.tileM;
  const rows = Math.round(f.tileM / 0.18); // 18 cm boards
  const rowH = N / rows;
  const rand = mulberry(seed);
  // plank boundaries per row, in px along x, wrapping at N
  const bounds: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const b: number[] = [];
    let x = rand() * N;
    const start = x;
    while (x < start + N - 0.5 * pxPerM) {
      b.push(x % N);
      x += (0.7 + rand() * 0.9) * pxPerM;
    }
    bounds.push(b.sort((a, c) => a - c));
  }
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    const r = Math.min(rows - 1, Math.floor(y / rowH));
    const vy = y - r * rowH;
    const b = bounds[r];
    for (let x = 0; x < N; x++) {
      let idx = b.findIndex((bx) => bx > x) - 1;
      if (idx < 0) idx = idx === -2 ? b.length - 1 : b.length - 1;
      const left = b[idx];
      const right = b[(idx + 1) % b.length] + (idx + 1 >= b.length ? N : 0);
      const dEnd = Math.min((x - left + N) % N, (right - x + N) % N);
      const dSide = Math.min(vy, rowH - vy);
      const seam = Math.min(dEnd, dSide);
      const plankId = r * 97 + idx;
      const tone = 1 + contrast * (hash(plankId, 1, seed) - 0.5) * 0.35;
      const grain = vnoise(x / 32, y / 2.2, N / 32, Math.round(N / 2.2), seed + plankId);
      const ringPhase = vy / rowH * 9 + 6 * vnoise(x / 180, plankId, Math.round(N / 180), 9999, seed + 3);
      const ring = Math.sin(ringPhase * Math.PI) ** 8;
      const k = y * N + x;
      let l = tone * (1 + contrast * 0.22 * (grain - 0.5) - contrast * 0.12 * ring);
      let h = 0.15 * grain;
      if (seam < 1.6) {
        l *= 0.45;
        h -= 0.6;
      }
      lum[k] = l;
      height[k] = h;
      rough[k] = 0.5 + 0.18 * grain + (seam < 1.6 ? 0.3 : 0);
    }
  }
  return { height, lum, rough };
}

function concrete(seed: number): Maps {
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const m = fbmTile(x, y, N, 6, 6, seed);
      const s = hash(x, y, seed + 1);
      const pore = hash(x >> 2, y >> 2, seed + 2) > 0.9985 ? 1 : 0;
      lum[k] = 1 + 0.16 * (m - 0.5) + 0.05 * (s - 0.5) - 0.3 * pore;
      height[k] = 0.05 * m - 0.2 * pore + 0.01 * s;
      rough[k] = 0.72 + 0.12 * (m - 0.5);
    }
  return { height, lum, rough };
}

function travertine(f: FloorFinish, seed: number): Maps {
  const tiles = Math.round(f.tileM / 0.6); // 60 × 60 cm slabs
  const t = N / tiles;
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const tx = Math.floor(x / t), ty = Math.floor(y / t);
      const id = ty * 31 + tx;
      const lx = x - tx * t, ly = y - ty * t;
      const joint = Math.min(lx, ly, t - lx, t - ly) < 1.5;
      const warp = 18 * vnoise(x / 64, y / 64, N / 64, N / 64, seed + id);
      const vein = Math.sin(((y + warp) / N) * Math.PI * 2 * 26 + id) ** 6;
      const m = fbmTile(x, y, N, 8, 4, seed + 5);
      const tone = 1 + 0.08 * (hash(id, 3, seed) - 0.5);
      lum[k] = joint ? 0.7 : tone * (1 + 0.1 * (m - 0.5) - 0.1 * vein);
      height[k] = joint ? -0.5 : 0.04 * m - 0.05 * vein;
      rough[k] = joint ? 0.9 : 0.55 + 0.1 * vein;
    }
  return { height, lum, rough };
}

const GENERATORS: Record<string, (f: FloorFinish) => Maps> = {
  "acik-mese": (f) => planks(f, 41, 0.7),
  ceviz: (f) => planks(f, 77, 1.2),
  "mikro-beton": () => concrete(13),
  traverten: (f) => travertine(f, 29),
};

async function write(file: string, data: Uint8Array, channels: 1 | 3, size = N) {
  const abs = path.join(PUBLIC, file);
  mkdirSync(path.dirname(abs), { recursive: true });
  await sharp(Buffer.from(data), { raw: { width: size, height: size, channels } }).webp({ quality: 86 }).toFile(abs);
}

async function main() {
  for (const f of FLOORS) {
    if (!force && existsSync(path.join(PUBLIC, f.thumb))) {
      console.log(`✓ ${f.id} (var, atlandı)`);
      continue;
    }
    const t0 = Date.now();
    const maps = GENERATORS[f.id](f);
    let mean = 0;
    for (const v of maps.lum) mean += v;
    mean /= maps.lum.length;
    const base = hexToRgb(f.avgColor).map(srgbToLinear);
    const albedo = new Uint8Array(N * N * 3);
    for (let k = 0; k < N * N; k++)
      for (let c = 0; c < 3; c++) albedo[k * 3 + c] = Math.round(linearToSrgb(Math.min(1, (base[c] * maps.lum[k]) / mean)) * 255);
    const mmPerPx = (f.tileM * 1000) / N;
    const normal = heightToNormal(maps.height, N, 1 / (8 * mmPerPx));
    const rough = new Uint8Array(N * N);
    for (let k = 0; k < N * N; k++) rough[k] = Math.round(Math.min(1, Math.max(0, maps.rough[k])) * 255);
    await write(f.albedo, albedo, 3);
    await write(f.normal, normal, 3);
    await write(f.roughness, rough, 1);
    const crop = Math.round(N * (0.6 / f.tileM));
    await sharp(Buffer.from(albedo), { raw: { width: N, height: N, channels: 3 } })
      .extract({ left: 0, top: 0, width: crop, height: crop })
      .resize(160, 160)
      .webp({ quality: 85 })
      .toFile(path.join(PUBLIC, f.thumb));
    console.log(`✓ ${f.id} ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
