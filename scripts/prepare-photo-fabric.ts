// Turns photos of a patterned fabric taken on the roll (at an angle, slightly
// draped) into texture sets for the catalogue, with the panel's own pipeline.
//
// For each photo:
//   1. the pattern's tilt is measured (the angle whose rows give the sharpest
//      colour bands) and the photo is turned level;
//   2. the flattest central part is kept;
//   3. the horizontal repeat of the pattern (one zigzag tooth) is measured;
//   4. width and height are searched for where the fabric repeats itself, a
//      thin band at the edges is cross-faded (overlapTile), relief and roughness are
//      derived (deriveMaps), and 2K/1K maps plus a swatch are written.
//
//   npx tsx scripts/prepare-photo-fabric.ts --series MISSO --type jakar --tooth-cm 2.4 a.jpg b.jpg …
//
// --tooth-cm is the real width of one tooth; it sets the fabric's scale on the
// furniture. Measure it on the fabric: it is not something a photo can tell.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import type { FabricType } from "../lib/types";
import {
  averageColor,
  deriveMaps,
  seamScore,
  type Pixels,
} from "../lib/fabric/process";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : fallback;
};
const series = opt("series", "").toUpperCase();
const type = opt("type", "jakar") as FabricType;
const toothCm = Number(opt("tooth-cm", "0"));
const outRoot = opt("out", path.join(process.cwd(), "public/seed/fabrics"));
// --config file.json: [{ "file", "angle", "crop": [x, y, w, h], "toothPx" }] measured by eye on the
// levelled photo; the script then only refines the tooth within ±20 %. Automatic measuring is
// a fallback: perspective, drape and low-contrast colourways fool it.
const configPath = opt("config", "");
interface Shot {
  file: string;
  /** Fabric code; default: series and the photo's position. */
  code?: string;
  /** Pixels per cm read off a ruler in this photo; then the scale comes from it, not from --tooth-cm. */
  pxPerCm?: number;
  angle?: number;
  crop?: [number, number, number, number];
  toothPx?: number;
}
const shots: Shot[] = configPath ? JSON.parse(readFileSync(configPath, "utf8")) : args.map((file) => ({ file }));
const photos = shots.map((s) => s.file);
if (!series || !(toothCm > 0) || !photos.length) {
  console.error(
    "Kullanım: --series AD --tooth-cm 2.4 [--type jakar] foto1.jpg …",
  );
  process.exit(1);
}

const ANALYSE = 360;

async function grey(
  img: Sharp,
  width: number,
  blur = 0,
): Promise<{ g: Uint8Array; w: number; h: number }> {
  let p = img.clone().resize(width).greyscale();
  if (blur) p = p.blur(blur);
  const { data, info } = await p.raw().toBuffer({ resolveWithObject: true });
  return { g: new Uint8Array(data), w: info.width, h: info.height };
}

/** Variance of row means over the central part: high when the colour bands are level. */
function bandSharpness(g: Uint8Array, w: number, h: number): number {
  const x0 = Math.round(w * 0.25);
  const x1 = Math.round(w * 0.75);
  const rows: number[] = [];
  for (let y = Math.round(h * 0.25); y < h * 0.75; y++) {
    let s = 0;
    for (let x = x0; x < x1; x++) s += g[y * w + x];
    rows.push(s / (x1 - x0));
  }
  const m = rows.reduce((a, b) => a + b, 0) / rows.length;
  return rows.reduce((a, b) => a + (b - m) ** 2, 0) / rows.length;
}

async function levelAngle(img: Sharp): Promise<number> {
  const small = sharp(await img.clone().resize(ANALYSE).toBuffer());
  let best = 0;
  let bestScore = -1;
  const tryAngle = async (a: number) => {
    const { g, w, h } = await grey(
      small.clone().rotate(a, { background: "#808080" }),
      ANALYSE,
      4,
    );
    const s = bandSharpness(g, w, h);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  };
  // beyond ±30° the bands of a low-contrast fabric can line up by accident
  for (let a = -30; a <= 30; a += 2) await tryAngle(a);
  const coarse = best;
  for (let a = coarse - 2; a <= coarse + 2; a += 0.25) await tryAngle(a);
  return best;
}

/** Horizontal period (px) of the pattern: the first strong peak of the mean row autocorrelation. */
function horizontalPeriod(g: Uint8Array, w: number, h: number, near?: number): number {
  const maxLag = near ? Math.min(Math.floor(w / 2), Math.ceil(near * 1.2) + 2) : Math.floor(w / 3);
  const score = new Float64Array(maxLag + 1);
  // light falls off across the photo; take it out so only the pattern is compared
  const r = Math.max(8, Math.round(w / 12));
  const row = new Float64Array(w);
  for (let y = 0; y < h; y += 2) {
    let acc = 0;
    const pre = new Float64Array(w + 1);
    for (let x = 0; x < w; x++) pre[x + 1] = pre[x] + g[y * w + x];
    for (let x = 0; x < w; x++) {
      const a = Math.max(0, x - r);
      const b = Math.min(w, x + r + 1);
      row[x] = g[y * w + x] - (pre[b] - pre[a]) / (b - a);
      acc += row[x] * row[x];
    }
    if (!acc) continue;
    for (let lag = 4; lag <= maxLag; lag++) {
      let s = 0;
      for (let x = 0; x + lag < w; x++) s += row[x] * row[x + lag];
      score[lag] += s / (w - lag) / (acc / w);
    }
  }
  // A symmetric zigzag crosses each row twice per tooth, so half a tooth
  // also correlates; the whole tooth correlates on every row and is the
  // strongest peak. If the strongest landed on two teeth, step back to one.
  const from = near ? Math.floor(near * 0.8) : 8;
  let best = from;
  for (let lag = from; lag < maxLag; lag++) if (score[lag] > score[best]) best = lag;
  const halfPeak = (lag: number) => {
    let m = Math.round(lag / 2);
    for (let k = m - 3; k <= m + 3; k++) if (score[k] > score[m]) m = k;
    return m;
  };
  if (!near && best > 30) {
    const half = halfPeak(best);
    if (score[half] > 0.93 * score[best] && score[half] >= score[half - 1] && score[half] >= score[half + 1]) best = half;
  }
  // refine with a parabola through the peak
  const a = score[best - 1];
  const b = score[best];
  const c = score[best + 1];
  return best + (a - c) / (2 * (a - 2 * b + c) || 1);
}

/**
 * Takes the photo's lighting out: the fabric was lit unevenly (a lamp on one
 * side, the drape turning away), which on a repeated tile shows as bands of
 * light and dark. Brightness is divided by its own blur over a couple of
 * pattern repeats, so the pattern stays and the slope of the light goes.
 */
function flattenLight(rgb: Uint8Array, w: number, h: number, radius: number): void {
  const L = new Float64Array(w * h);
  let mean = 0;
  for (let i = 0; i < w * h; i++) {
    L[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];
    mean += L[i];
  }
  mean /= w * h;
  const box = (src: Float64Array, horizontal: boolean) => {
    const dst = new Float64Array(src.length);
    const [n, m] = horizontal ? [h, w] : [w, h];
    for (let a = 0; a < n; a++) {
      const pre = new Float64Array(m + 1);
      for (let b = 0; b < m; b++) pre[b + 1] = pre[b] + src[horizontal ? a * w + b : b * w + a];
      for (let b = 0; b < m; b++) {
        const lo = Math.max(0, b - radius);
        const hi = Math.min(m, b + radius + 1);
        dst[horizontal ? a * w + b : b * w + a] = (pre[hi] - pre[lo]) / (hi - lo);
      }
    }
    return dst;
  };
  // two box passes each way: close to a gaussian
  const blur = box(box(box(box(L, true), false), true), false);
  for (let i = 0; i < w * h; i++) {
    const k = mean / Math.max(8, blur[i]);
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = Math.min(255, Math.round(rgb[i * 3 + c] * k));
  }
}

/** Mean squared colour difference between two vertical (or horizontal) strips of an RGB image. */
function stripDiff(rgb: Uint8Array, w: number, a: number, b: number, len: number, band: number, vertical: boolean): number {
  let sum = 0;
  let n = 0;
  for (let k = 0; k < band; k++)
    for (let t = 0; t < len; t += 2) {
      const i = vertical ? (t * w + a + k) * 3 : ((a + k) * w + t) * 3;
      const j = vertical ? (t * w + b + k) * 3 : ((b + k) * w + t) * 3;
      for (let c = 0; c < 3; c++) sum += (rgb[i + c] - rgb[j + c]) ** 2;
      n++;
    }
  return sum / n;
}

/**
 * Cuts a tile that repeats on its own: the width is searched near the given
 * number of teeth, the height over the whole crop, each for the place where
 * the fabric looks most like itself again. Only a thin band at each edge is
 * then cross-faded into the fabric just beyond it, so there is no ghosting
 * of a shifted copy over the pattern (what a half-shift blend does to a
 * zigzag).
 */
function overlapTile(rgb: Uint8Array, w: number, h: number, approxW: number): { tile: Uint8ClampedArray; width: number; height: number } {
  const bx = Math.max(6, Math.round(approxW * 0.06));
  let tw = Math.round(approxW);
  let best = Infinity;
  for (let W = Math.round(approxW * 0.94); W <= Math.round(approxW * 1.06) && W + bx < w; W++) {
    const d = stripDiff(rgb, w, 0, W, h, bx, true);
    if (d < best) {
      best = d;
      tw = W;
    }
  }
  const by = Math.max(6, Math.round(h * 0.06));
  let th = h - by;
  best = Infinity;
  for (let T = Math.round(Math.max(tw * 0.6, h * 0.45)); T + by < h; T++) {
    const d = stripDiff(rgb, w, 0, T, tw + bx, by, false);
    if (d < best) {
      best = d;
      th = T;
    }
  }
  const tile = new Uint8ClampedArray(tw * th * 4);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      // near the left/top edge, fade from the fabric that follows the right/bottom edge
      const mx = x < bx ? smooth(x / bx) : 1;
      const my = y < by ? smooth(y / by) : 1;
      const o = (y * tw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const at = (yy: number, xx: number) => rgb[(yy * w + xx) * 3 + c];
        // read beyond the tile only inside the bands: elsewhere it may lie outside the crop
        const row = (yy: number) => (mx < 1 ? at(yy, x) * mx + at(yy, x + tw) * (1 - mx) : at(yy, x));
        tile[o + c] = my < 1 ? row(y) * my + row(y + th) * (1 - my) : row(y);
      }
      tile[o + 3] = 255;
    }
  return { tile, width: tw, height: th };
}

async function main() {
  const out: Record<string, unknown>[] = [];
  const dir = path.join(outRoot, series.toLowerCase());
  mkdirSync(dir, { recursive: true });

  for (const [i, file] of photos.entries()) {
    const code = shots[i].code ?? `${series}-${String(i + 1).padStart(2, "0")}`;
    const src = sharp(file).rotate(); // honour EXIF orientation
    const shot = shots[i];
    const angle = shot.angle ?? (await levelAngle(src));
    const level = sharp(
      await src.clone().rotate(angle, { background: "#808080" }).toBuffer(),
    );
    const meta = await level.metadata();
    // keep the flat middle: away from the rotated corners and the drape at the edges
    const [cx, cy, cw, ch] = shot.crop ?? [
      Math.round(meta.width! * 0.22),
      Math.round(meta.height! * 0.25),
      Math.round(meta.width! * 0.56),
      Math.round(meta.height! * 0.5),
    ];
    const centre = sharp(
      await level
        .clone()
        .extract({ left: cx, top: cy, width: cw, height: ch })
        .toBuffer(),
    );
    const { g, w, h } = await grey(centre, cw);
    const period = horizontalPeriod(g, w, h, shot.toothPx);
    const { data: rgb } = await centre.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    flattenLight(rgb, cw, ch, Math.round(period * 1.5));
    // as many whole teeth as fit with room for the overlap band
    const teeth = Math.max(2, Math.floor((cw * 0.85) / period));
    const { tile: tilePx, width: tileW, height: tileH } = overlapTile(rgb, cw, ch, teeth * period);
    const tile = await sharp(Buffer.from(tilePx), { raw: { width: tileW, height: tileH, channels: 4 } })
      .resize(2048, Math.round((2048 * tileH) / tileW), { kernel: "lanczos3" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px: Pixels = {
      data: new Uint8ClampedArray(tile.data),
      width: tile.info.width,
      height: tile.info.height,
    };
    const before = seamScore(px);
const repeatW = Math.round((shot.pxPerCm ? tileW / shot.pxPerCm : (tileW / period) * toothCm) * 10) / 10;
    const repeatH = Math.round(((repeatW * px.height) / px.width) * 10) / 10;
    const { normal, roughness } = deriveMaps(px, type, repeatW);

    const c = code.toLowerCase();
    const raw = (data: Uint8ClampedArray) =>
      sharp(Buffer.from(data), {
        raw: { width: px.width, height: px.height, channels: 4 },
      });
    const write = async (
      img: Sharp,
      name: string,
      half = false,
      kind: "photo" | "data" = "photo",
    ) => {
      let p = img.clone().removeAlpha();
      if (half) p = p.resize(Math.round(px.width / 2));
      await p
        .webp(kind === "photo" ? { quality: 88 } : { quality: 90 })
        .toFile(path.join(dir, name));
    };
    const albedo = raw(px.data);
    await write(albedo, `${c}-albedo-2k.webp`);
    await write(albedo, `${c}-albedo-1k.webp`, true);
    await write(raw(normal), `${c}-normal-2k.webp`, false, "data");
    await write(raw(normal), `${c}-normal-1k.webp`, true, "data");
    await write(raw(roughness), `${c}-roughness-2k.webp`, false, "data");
    await write(raw(roughness), `${c}-roughness-1k.webp`, true, "data");
    // swatch: an 8 cm square from the middle, so a few teeth show
    const side = Math.min(
      px.width,
      px.height,
      Math.round((px.width * 8) / repeatW),
    );
    await albedo
      .clone()
      .extract({
        left: Math.round((px.width - side) / 2),
        top: Math.round((px.height - side) / 2),
        width: side,
        height: side,
      })
      .resize(192, 192)
      .removeAlpha()
      .webp({ quality: 88 })
      .toFile(path.join(dir, `${c}-thumb.webp`));

    const row = {
      code,
      file: path.basename(file),
      angle,
      periodPx: Math.round(period * 10) / 10,
      teeth,
      repeatCm: { w: repeatW, h: repeatH },
      avgColor: averageColor(px),
      seamBefore: Math.round(before * 100) / 100,
      seamAfter: Math.round(seamScore(px) * 100) / 100,
    };
    console.log(JSON.stringify(row));
    out.push(row);
  }
  // keep the rows of fabrics not prepared in this run
  const file = path.join(dir, "olcum.json");
  let previous: { code: string }[] = [];
  try {
    previous = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    previous = [];
  }
  const merged = [...previous.filter((r) => !out.some((o) => o.code === r.code)), ...out].sort((a, b) => String(a.code).localeCompare(String(b.code)));
  writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
