import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getPanelUser } from "@/lib/auth/panel";
import { STORAGE_BUCKET, publicFileUrl, supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";

// Panel uploads.
//  - POST ?hazirla  {path}  → with Supabase: a signed upload URL, so large
//    files (GLB) go straight to Supabase Storage without passing through here.
//  - POST ?path=…  (raw body) → demo mode: stored in memory.

const SAFE_PATH = /^(kumaslar|modeller|logolar)\/[a-z0-9._/-]{3,160}$/;
const TYPES = new Set(["image/webp", "image/jpeg", "image/png", "model/gltf-binary", "application/octet-stream"]);
// No SVG: it can carry script and would be served from our own origin.

export async function POST(request: Request) {
  if (!(await getPanelUser())) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  const url = new URL(request.url);

  if (url.searchParams.has("hazirla")) {
    const { path } = (await request.json()) as { path?: string };
    if (!path || !SAFE_PATH.test(path)) return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
    if (!supabaseEnabled()) return NextResponse.json({ mode: "direct" });
    const { data, error } = await serviceClient().storage.from(STORAGE_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Yükleme hazırlanamadı." }, { status: 500 });
    return NextResponse.json({ mode: "signed", token: data.token, path: data.path, publicUrl: publicFileUrl(path) });
  }

  const path = url.searchParams.get("path") ?? "";
  if (!SAFE_PATH.test(path)) return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
  const type = request.headers.get("content-type") ?? "application/octet-stream";
  if (!TYPES.has(type)) return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 415 });
  const data = await request.arrayBuffer();
  if (data.byteLength > 40 * 1024 * 1024) return NextResponse.json({ error: "Dosya çok büyük." }, { status: 413 });
  const fileUrl = await getRepository().putFile(path, data, type);
  return NextResponse.json({ url: fileUrl });
}
