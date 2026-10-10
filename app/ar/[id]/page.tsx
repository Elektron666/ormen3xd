import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { zoneFabricsOf } from "@/lib/three/zones";
import { loadCatalogue } from "@/lib/data";
import { decodeShare } from "@/lib/share";
import { initialStateFrom } from "@/lib/page-state";
import { ArLanding } from "./ArLanding";

// Opened on the phone from the QR in "Odamda gör": one piece of a shared
// layout, in its fabric, ready for AR.

async function resolve(id: string, parca: unknown) {
  const state = decodeShare(id);
  if (!state) return null;
  const cat = (state.f ? await loadCatalogue(state.f) : null) ?? (await loadCatalogue(null))!;
  if (!cat.models.length) return null;
  const layout = initialStateFrom(state, cat.models, cat.fabrics).initialLayout;
  if (!layout) return null;
  const i = typeof parca === "string" && /^\d{1,2}$/.test(parca) ? Number(parca) : 0;
  const piece = layout[i] ?? layout[0];
  const model = cat.models.find((m) => m.slug === piece.modelSlug)!;
  const fabric = cat.fabrics.find((f) => f.code === piece.fabricCode)!;
  const zoneFabrics = zoneFabricsOf(piece, new Map(cat.fabrics.map((f) => [f.code, f])));
  return { model, fabric, zoneFabrics, legFinish: piece.ayak, firm: cat.firm };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/ar/[id]">): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await resolve(id, sp.parca);
  return {
    title: r ? `${r.model.name} · ${r.fabric.code} · Odanızda görün` : "Bulunamadı",
    robots: { index: false },
  };
}

export default async function ArPage({ params, searchParams }: PageProps<"/ar/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const r = await resolve(id, sp.parca);
  if (!r) notFound();
  return (
    <main>
      <ArLanding model={r.model} fabric={r.fabric} zoneFabrics={r.zoneFabrics} legFinish={r.legFinish} firm={r.firm} backHref={`/p/${id}`} />
    </main>
  );
}
