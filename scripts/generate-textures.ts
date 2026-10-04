// Generates the placeholder fabric textures (albedo, normal, roughness at 1K
// and 2K, plus a shaded swatch thumbnail) into public/seed/fabrics.
//
// Everything is synthesised from code: no downloaded imagery, no licences.
// Patterns are modelled in millimetres so the real-world scale is honest:
// a 3 mm bouclé loop really is 3 mm on the 12 cm tile.
//
//   npm run textures            # generate if missing
//   npm run textures -- --force # regenerate everything

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SEED_SERIES, seedCode, seedTexturePaths, type SeedPattern } from "../lib/seed/fabrics";
import { heightToNormal, hexToRgb, linearToSrgb, srgbToLinear } from "../lib/fabric/maps";
import { fbmTile, hash, mulberry, vnoise } from "./noise";

const N = 2048;
const PUBLIC = path.join(process.cwd(), "public");
const force = process.argv.includes("--force");

const fbm = (x: number, y: number, base: number, octaves: number, seed: number) => fbmTile(x, y, N, base, octaves, seed);

// -------------------------------------------------------------- patterns ----

interface Maps {
  /** Surface height in millimetres. */
  height: Float32Array;
  /** Linear luminance multiplier (normalised to mean 1 afterwards). */
  lum: Float32Array;
  /** Roughness 0..1. */
  rough: Float32Array;
}

const yarn = (f: number, thick: number) => {
  const d = Math.abs(2 * f - 1) / thick;
  return d < 1 ? Math.sqrt(1 - d * d) : 0;
};

function plainWeave(tileCm: number, seed: number): Maps {
  const threads = Math.round(tileCm * 4); // 4 yarns per cm
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  const warpT = Array.from({ length: threads }, (_, i) => 0.82 + 0.3 * hash(i, 1, seed));
  const weftT = Array.from({ length: threads }, (_, j) => 0.82 + 0.3 * hash(j, 2, seed));
  const warpTone = Array.from({ length: threads }, (_, i) => 1.06 + 0.1 * (hash(i, 3, seed) - 0.5));
  const weftTone = Array.from({ length: threads }, (_, j) => 0.94 + 0.1 * (hash(j, 4, seed) - 0.5));
  const amp = 0.55; // mm

  for (let y = 0; y < N; y++) {
    const v = ((y + 0.5) / N) * threads, j = Math.floor(v), fv = v - j;
    for (let x = 0; x < N; x++) {
      const u = ((x + 0.5) / N) * threads, i = Math.floor(u), fu = u - i;
      const warpUnd = 0.5 + 0.5 * Math.cos(Math.PI * (v - 0.5 + i));
      const weftUnd = 0.5 - 0.5 * Math.cos(Math.PI * (u - 0.5 + j));
      // slubs: slow thickness/tone change along each yarn
      const slubW = vnoise(v * 0.7, i, Math.round(threads * 0.7), threads, seed + 5);
      const slubF = vnoise(u * 0.7, j, Math.round(threads * 0.7), threads, seed + 6);
      const hw = yarn(fu, warpT[i] * (0.9 + 0.2 * slubW)) * (0.3 + 0.7 * warpUnd) * amp;
      const hf = yarn(fv, weftT[j] * (0.9 + 0.2 * slubF)) * (0.3 + 0.7 * weftUnd) * amp;
      const warpTop = hw >= hf;
      const fibre = warpTop
        ? vnoise(x / 2, y / 14, N / 2, N / 14, seed + 7)
        : vnoise(x / 14, y / 2, N / 14, N / 2, seed + 8);
      const h = Math.max(hw, hf) + 0.04 * (fibre - 0.5);
      const k = y * N + x;
      height[k] = h;
      const tone = warpTop ? warpTone[i] * (0.96 + 0.08 * slubW) : weftTone[j] * (0.96 + 0.08 * slubF);
      lum[k] = tone * (0.5 + 0.5 * Math.min(1, h / amp)) * (0.94 + 0.12 * fibre);
      rough[k] = 0.95 - 0.1 * Math.min(1, h / amp) + 0.04 * (fibre - 0.5);
    }
  }
  return { height, lum, rough };
}

function herringbone(tileCm: number, seed: number): Maps {
  const threads = Math.round(tileCm * 6.25); // 60 yarns on a 9.6 cm tile
  const band = 10; // threads per zig-zag band (threads / band must be even)
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  const amp = 0.5;
  for (let y = 0; y < N; y++) {
    const v = ((y + 0.5) / N) * threads, j = Math.floor(v), fv = v - j;
    for (let x = 0; x < N; x++) {
      const u = ((x + 0.5) / N) * threads, i = Math.floor(u), fu = u - i;
      const dir = Math.floor(i / band) % 2 === 0 ? 1 : -1;
      const warpOver = (((i + dir * j) % 4) + 4) % 4 < 2;
      const fibreW = vnoise(x / 2, y / 12, N / 2, N / 12, seed + 1);
      const fibreF = vnoise(x / 12, y / 2, N / 12, N / 2, seed + 2);
      const hw = yarn(fu, 1.1) * (warpOver ? 1 : 0.35) * amp;
      const hf = yarn(fv, 1.1) * (warpOver ? 0.35 : 1) * amp;
      const warpTop = hw >= hf;
      const fibre = warpTop ? fibreW : fibreF;
      const h = Math.max(hw, hf) + 0.035 * (fibre - 0.5);
      const k = y * N + x;
      height[k] = h;
      const tone = warpTop ? 1.14 + 0.05 * (hash(i, 9, seed) - 0.5) : 0.86 + 0.05 * (hash(j, 10, seed) - 0.5);
      lum[k] = tone * (0.68 + 0.32 * Math.min(1, h / amp)) * (0.94 + 0.12 * fibre);
      rough[k] = 0.93 - 0.08 * Math.min(1, h / amp);
    }
  }
  return { height, lum, rough };
}

function boucle(tileCm: number, seed: number): Maps {
  const pxPerMm = N / (tileCm * 10);
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  const tone = new Float32Array(N * N).fill(0.8);
  const rand = mulberry(seed);

  // ground cloth
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) height[y * N + x] = 0.25 * fbm(x, y, 64, 3, seed);

  const area = (tileCm * 10) ** 2;
  const loops = Math.round(area / 2.4);
  const curls = Math.round(area / 5);
  const total = loops + curls;
  for (let n = 0; n < total; n++) {
    const big = n < loops;
    const cx = rand() * N, cy = rand() * N;
    const r = (big ? 0.9 + 1.1 * rand() : 0.4 + 0.4 * rand()) * pxPerMm;
    const t = (big ? 0.42 + 0.25 * rand() : 0.3 + 0.15 * rand()) * pxPerMm;
    const amp = big ? 1.0 + 0.7 * rand() : 0.7 + 0.4 * rand();
    const aspect = 0.55 + 0.45 * rand();
    const rot = rand() * Math.PI;
    const tilt = rand() * Math.PI * 2;
    const loopTone = 0.93 + 0.14 * rand();
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const ext = Math.ceil(r + t + 1);
    for (let oy = -ext; oy <= ext; oy++) {
      for (let ox = -ext; ox <= ext; ox++) {
        const lx = ox * cr + oy * sr;
        const ly = (-ox * sr + oy * cr) / aspect;
        const dist = Math.hypot(lx, ly);
        const d = Math.abs(dist - r) / t;
        if (d >= 1) continue;
        const phi = Math.atan2(ly, lx);
        const h = amp * Math.sqrt(1 - d * d) * (0.65 + 0.35 * Math.cos(phi - tilt));
        const px = (((Math.round(cx + ox)) % N) + N) % N;
        const py = (((Math.round(cy + oy)) % N) + N) % N;
        const k = py * N + px;
        if (h > height[k]) {
          height[k] = h;
          tone[k] = loopTone;
        }
      }
    }
  }
  for (let k = 0; k < N * N; k++) {
    const x = k % N, y = (k / N) | 0;
    const fuzz = hash(x, y, seed + 3);
    height[k] += 0.03 * (fuzz - 0.5);
    lum[k] = tone[k] * (0.55 + 0.45 * Math.pow(Math.min(1, Math.max(0, height[k]) / 1.4), 0.8)) * (0.96 + 0.08 * fuzz);
    rough[k] = 0.97;
  }
  return { height, lum, rough };
}

function nubuck(tileCm: number, seed: number): Maps {
  void tileCm;
  const height = new Float32Array(N * N), lum = new Float32Array(N * N), rough = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = y * N + x;
      const mottle = fbm(x, y, 12, 5, seed);
      const nap = vnoise(x / 3, y / 5, Math.round(N / 3), Math.round(N / 5), seed + 4);
      const grain = hash(x, y, seed + 9);
      height[k] = 0.08 * mottle + 0.012 * nap + 0.006 * grain;
      lum[k] = 1 + 0.14 * (mottle - 0.5) + 0.04 * (nap - 0.5) + 0.03 * (grain - 0.5);
      rough[k] = 0.84 + 0.1 * (mottle - 0.5);
    }
  }
  return { height, lum, rough };
}

const PATTERNS: Record<SeedPattern, (tileCm: number, seed: number) => Maps> = {
  plain: plainWeave,
  herringbone,
  boucle,
  nubuck,
};

// --------------------------------------------------------------- output ----

async function writePair(paths: Record<"1k" | "2k", string>, data: Uint8Array, channels: 1 | 3) {
  const raw = { raw: { width: N, height: N, channels } } as const;
  for (const p of Object.values(paths)) mkdirSync(path.dirname(path.join(PUBLIC, p)), { recursive: true });
  await sharp(Buffer.from(data), raw).webp({ quality: 88 }).toFile(path.join(PUBLIC, paths["2k"]));
  await sharp(Buffer.from(data), raw)
    .resize(N / 2, N / 2, { kernel: "lanczos3" })
    .webp({ quality: 86 })
    .toFile(path.join(PUBLIC, paths["1k"]));
}

async function main() {
  for (const [si, s] of SEED_SERIES.entries()) {
    const first = seedTexturePaths(s.series, seedCode(s.series, 0));
    if (!force && existsSync(path.join(PUBLIC, first.thumb))) {
      console.log(`✓ ${s.series} (var, atlandı)`);
      continue;
    }
    const t0 = Date.now();
    const maps = PATTERNS[s.pattern](s.tileCm, 1000 + si * 101);

    // normalise luminance to mean 1 so the mean albedo equals the series colour
    let mean = 0;
    for (const v of maps.lum) mean += v;
    mean /= maps.lum.length;
    for (let k = 0; k < maps.lum.length; k++) maps.lum[k] /= mean;

    const mmPerPx = (s.tileCm * 10) / N;
    const normal = heightToNormal(maps.height, N, 1 / (8 * mmPerPx));
    const rough8 = new Uint8Array(N * N);
    for (let k = 0; k < N * N; k++) rough8[k] = Math.round(Math.min(1, Math.max(0, maps.rough[k])) * 255);

    await writePair(first.normal, normal, 3);
    await writePair(first.roughness, rough8, 1);

    for (const [ci, c] of s.colors.entries()) {
      const code = seedCode(s.series, ci);
      const p = seedTexturePaths(s.series, code);
      const base = hexToRgb(c.hex).map(srgbToLinear);
      const albedo = new Uint8Array(N * N * 3);
      const sum = [0, 0, 0];
      for (let k = 0; k < N * N; k++) {
        for (let ch = 0; ch < 3; ch++) {
          const lin = Math.min(1, base[ch] * maps.lum[k]);
          sum[ch] += lin;
          albedo[k * 3 + ch] = Math.round(linearToSrgb(lin) * 255);
        }
      }
      await writePair(p.albedo, albedo, 3);

      // thumbnail: a 4 cm crop, lit from the top-left so the weave reads
      const crop = Math.min(N, Math.round((4 / s.tileCm) * N));
      const shaded = new Uint8Array(crop * crop * 3);
      const L = [-0.45, 0.55, 0.7];
      const lLen = Math.hypot(L[0], L[1], L[2]);
      for (let y = 0; y < crop; y++) {
        for (let x = 0; x < crop; x++) {
          const k = y * N + x;
          const nx = normal[k * 3] / 127.5 - 1, ny = normal[k * 3 + 1] / 127.5 - 1, nz = normal[k * 3 + 2] / 127.5 - 1;
          const ndl = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / lLen) / (L[2] / lLen);
          const shade = 0.35 + 0.65 * ndl;
          for (let ch = 0; ch < 3; ch++) {
            const lin = Math.min(1, base[ch] * maps.lum[k] * shade);
            shaded[(y * crop + x) * 3 + ch] = Math.round(linearToSrgb(lin) * 255);
          }
        }
      }
      await sharp(Buffer.from(shaded), { raw: { width: crop, height: crop, channels: 3 } })
        .resize(192, 192, { kernel: "lanczos3" })
        .webp({ quality: 85 })
        .toFile(path.join(PUBLIC, p.thumb));

      const avg = sum.map((v) => linearToSrgb(v / (N * N)));
      const drift = Math.max(...avg.map((v, ch) => Math.abs(v - hexToRgb(c.hex)[ch]))) * 255;
      if (drift > 3) console.warn(`  ! ${code}: ortalama renk ${drift.toFixed(1)} birim kaydı`);
    }
    console.log(`✓ ${s.series} ${s.colors.length} renk, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
