import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { validateSample } from "@/lib/samples";

// Receives a sample request from the configurator form. No IP or device data
// is stored with it; only what the customer typed and the chosen fabrics.

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  // honeypot filled in: answer like a success, store nothing
  if (typeof (body as { web?: unknown })?.web === "string" && (body as { web: string }).web.trim()) return NextResponse.json({ id: "ok" }, { status: 201 });
  const result = validateSample(body as Record<string, never>);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  const repo = getRepository();
  const fabrics = new Set((await repo.listFabrics()).map((f) => f.code));
  if (result.value.fabricCodes.some((c) => !fabrics.has(c))) {
    return NextResponse.json({ errors: { fabricCodes: "Bilinmeyen kumaş kodu." } }, { status: 422 });
  }
  // a firm that no longer exists (or a made-up slug) is not attributed
  const firm = result.value.firmSlug ? await repo.getFirmBySlug(result.value.firmSlug) : null;
  const saved = await repo.createSampleRequest({ ...result.value, firmSlug: firm?.slug ?? null });
  return NextResponse.json({ id: saved.id }, { status: 201 });
}
