"use client";

import { createClient } from "@supabase/supabase-js";
import { extensionFor, type MapKey, type ProcessedFabric } from "@/lib/fabric/process-browser";
import type { TextureMapSet } from "@/lib/types";

// Uploads one file from the panel and returns its public URL. With Supabase
// the file goes straight to Storage through a signed URL; in demo mode it is
// posted to the app.

const STORAGE_BUCKET = "atelier";

export async function uploadFile(path: string, blob: Blob): Promise<string> {
  const prep = await fetch("/api/panel/dosya?hazirla", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const info = (await prep.json()) as { mode?: "direct" | "signed"; token?: string; path?: string; publicUrl?: string; error?: string };
  if (!prep.ok) throw new Error(info.error ?? "Yükleme hazırlanamadı.");

  if (info.mode === "signed") {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await sb.storage.from(STORAGE_BUCKET).uploadToSignedUrl(info.path!, info.token!, blob, { contentType: blob.type, upsert: true });
    if (error) throw new Error(error.message);
    return info.publicUrl!;
  }

  const res = await fetch(`/api/panel/dosya?path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "content-type": blob.type || "application/octet-stream" },
    body: blob,
  });
  const out = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !out.url) throw new Error(out.error ?? "Dosya yüklenemedi.");
  return out.url;
}

/** Short random suffix so a re-upload never hits an old cached file. */
export function stamp(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Lower-case, ASCII, dash-separated (for file paths and URL slugs). */
export function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const MAP_KEYS: MapKey[] = ["albedo-2k", "albedo-1k", "normal-2k", "normal-1k", "roughness-2k", "roughness-1k", "thumb"];

/** Uploads the seven files of a processed fabric photo into a fresh folder. */
export async function uploadFabricMaps(
  code: string,
  processed: ProcessedFabric,
  onProgress?: (done: number, total: number) => void,
): Promise<{ maps: TextureMapSet; thumbUrl: string; avgColor: string; derivedMaps: true }> {
  const folder = `kumaslar/${slugify(code)}-${stamp()}`;
  const urls = {} as Record<MapKey, string>;
  for (const [i, key] of MAP_KEYS.entries()) {
    onProgress?.(i, MAP_KEYS.length);
    const blob = processed.files[key];
    urls[key] = await uploadFile(`${folder}/${key}.${extensionFor(blob)}`, blob);
  }
  onProgress?.(MAP_KEYS.length, MAP_KEYS.length);
  return {
    maps: {
      albedo: { "1k": urls["albedo-1k"], "2k": urls["albedo-2k"] },
      normal: { "1k": urls["normal-1k"], "2k": urls["normal-2k"] },
      roughness: { "1k": urls["roughness-1k"], "2k": urls["roughness-2k"] },
    },
    thumbUrl: urls.thumb,
    avgColor: processed.avgColor,
    derivedMaps: true,
  };
}
