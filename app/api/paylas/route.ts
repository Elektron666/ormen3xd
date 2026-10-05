import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { decodeShare } from "@/lib/share";
import { shortCode } from "@/lib/short-link";

// Turns a long share id into a short link. Anyone may ask (the configurator
// is public), but only a valid combination is stored, and the same one always
// maps to the same row, so repeating the request adds nothing.
//   POST { id } → { path: "/s/Ab3dE9xK" }

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 2000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  let id: unknown;
  try {
    id = (JSON.parse(text) as { id?: unknown }).id;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const state = typeof id === "string" ? decodeShare(id) : null;
  if (!state) return NextResponse.json({ error: "Geçersiz kombinasyon." }, { status: 422 });
  const repo = getRepository();
  // On Vercel without Supabase the store lives in one server instance's memory;
  // a short link could stop working, so the (always working) long link is kept.
  if (!repo.persistent && process.env.VERCEL) return NextResponse.json({ error: "Kısa link için Supabase gerekli." }, { status: 503 });
  try {
    // an (astronomically unlikely) clash with another combination gets a longer code
    for (const len of [8, 10]) {
      const code = shortCode(id as string, len);
      if (await repo.saveShare(code, id as string, state.f ?? null)) return NextResponse.json({ path: `/s/${code}` });
    }
  } catch {
    // storage unavailable: the client keeps the long link
  }
  return NextResponse.json({ error: "Kısa link oluşturulamadı." }, { status: 503 });
}
