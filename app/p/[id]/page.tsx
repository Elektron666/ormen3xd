import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";
import { decodeShare } from "@/lib/share";
import { summariseShare } from "@/lib/share-summary";

/** The firm's catalogue when the link came from a firm page; ORMEN's if that firm is gone. */
async function catalogueFor(id: string) {
  const f = decodeShare(id)?.f;
  return (f ? await loadCatalogue(f) : null) ?? (await loadCatalogue(null))!;
}

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { firm, models, fabrics } = await catalogueFor(id);
  const summary = summariseShare(id, models, fabrics);
  if (!summary) return { title: "Kombinasyon bulunamadı" };
  const codes = summary.fabrics.map((f) => f.code).join(" · ");
  const names = [...new Set(summary.pieces.map((p) => p.model.name))].join(", ");
  const by = firm ? `${firm.name} · ` : "";
  return {
    title: `${codes}`,
    description: `${by}${names} için seçilen ORMEN kumaşları: ${codes}. Açın, döndürün, numune isteyin.`,
    openGraph: { title: `${by}ORMEN kumaş kombinasyonu · ${codes}`, description: `${names} · Kumaşlar: ORMEN TEKSTİL` },
  };
}

export default async function SharedPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const state = decodeShare(id);
  if (!state) notFound();
  const { firm, models, fabrics } = await catalogueFor(id);
  if (models.length === 0) notFound();
  const initial = initialStateFrom(state, models, fabrics);
  if (!initial.initialLayout) notFound();

  return (
    <main>
      <h1 className="sr-only">{firm ? `${firm.name}: ` : ""}Paylaşılan ORMEN kumaş kombinasyonu</h1>
      <Configurator models={models} fabrics={fabrics} firm={firm} {...initial} />
    </main>
  );
}
