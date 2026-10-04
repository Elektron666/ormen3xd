"use client";

import type { FabricType } from "@/lib/types";
import { averageColor, deriveMaps, makeSeamless, seamScore, type Pixels } from "./process";

// Browser side of the fabric pipeline: read the photo, prepare 2K and 1K
// maps, encode them, and hand back blobs for upload plus object URLs for the
// live preview.

export type MapKey = "albedo-2k" | "albedo-1k" | "normal-2k" | "normal-1k" | "roughness-2k" | "roughness-1k" | "thumb";

export interface ProcessedFabric {
  files: Record<MapKey, Blob>;
  urls: Record<MapKey, string>;
  avgColor: string;
  seam: number;
  /** Photo aspect (height / width), to suggest the repeat height. */
  aspect: number;
}

export async function readPixels(file: Blob, maxSide = 2048): Promise<Pixels> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(8, Math.round(bmp.width * k));
  const h = Math.max(8, Math.round(bmp.height * k));
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const img = ctx.getImageData(0, 0, w, h);
  return { data: img.data, width: w, height: h };
}

function toCanvas(p: Pixels): OffscreenCanvas {
  const c = new OffscreenCanvas(p.width, p.height);
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  return c;
}

function scaled(src: OffscreenCanvas, w: number, h: number): OffscreenCanvas {
  const c = new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** WebP where the browser can encode it, JPEG/PNG otherwise (older Safari). */
async function encode(c: OffscreenCanvas, kind: "photo" | "data"): Promise<Blob> {
  const webp = await c.convertToBlob({ type: "image/webp", quality: 0.88 });
  if (webp.type === "image/webp") return webp;
  return c.convertToBlob(kind === "photo" ? { type: "image/jpeg", quality: 0.9 } : { type: "image/png" });
}

export async function processFabricPhoto(
  file: Blob,
  opts: { type: FabricType; repeatWidthCm: number; fixSeam: boolean },
): Promise<ProcessedFabric> {
  let px = await readPixels(file);
  const seam = seamScore(px);
  if (opts.fixSeam) px = makeSeamless(px);
  const { normal, roughness } = deriveMaps(px, opts.type, opts.repeatWidthCm);

  const albedo2 = toCanvas(px);
  const normal2 = toCanvas({ data: normal, width: px.width, height: px.height });
  const rough2 = toCanvas({ data: roughness, width: px.width, height: px.height });
  const half = (c: OffscreenCanvas) => scaled(c, c.width / 2, c.height / 2);
  // swatch: a ~5 cm square from the centre
  const side = Math.min(px.width, px.height, Math.round((px.width * 5) / opts.repeatWidthCm));
  const thumbSrc = new OffscreenCanvas(side, side);
  thumbSrc.getContext("2d")!.drawImage(albedo2, (px.width - side) / 2, (px.height - side) / 2, side, side, 0, 0, side, side);

  const files: Record<MapKey, Blob> = {
    "albedo-2k": await encode(albedo2, "photo"),
    "albedo-1k": await encode(half(albedo2), "photo"),
    "normal-2k": await encode(normal2, "data"),
    "normal-1k": await encode(half(normal2), "data"),
    "roughness-2k": await encode(rough2, "data"),
    "roughness-1k": await encode(half(rough2), "data"),
    thumb: await encode(scaled(thumbSrc, 192, 192), "photo"),
  };
  const urls = Object.fromEntries(Object.entries(files).map(([k, b]) => [k, URL.createObjectURL(b)])) as Record<MapKey, string>;
  return { files, urls, avgColor: averageColor(px), seam, aspect: px.height / px.width };
}

export function revoke(p: ProcessedFabric | null | undefined) {
  if (p) Object.values(p.urls).forEach((u) => URL.revokeObjectURL(u));
}

export function extensionFor(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "bin";
}
