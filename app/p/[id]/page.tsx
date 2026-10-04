import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";
import { decodeShare } from "@/lib/share";
import { summariseShare } from "@/lib/share-summary";

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listShowcaseModels(), repo.listFabrics()]);
  const summary = summariseShare(id, models, fabrics);
  if (!summary) return { title: "Kombinasyon bulunamadı" };
  const codes = summary.fabrics.map((f) => f.code).join(" · ");
  const names = [...new Set(summary.pieces.map((p) => p.model.name))].join(", ");
  return {
    title: `${codes}`,
    description: `${names} için seçilen ORMEN kumaşları: ${codes}. Açın, döndürün, numune isteyin.`,
    openGraph: { title: `ORMEN kumaş kombinasyonu · ${codes}`, description: `${names} · Kumaşlar: ORMEN TEKSTİL` },
  };
}

export default async function SharedPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const state = decodeShare(id);
  if (!state) notFound();
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listShowcaseModels(), repo.listFabrics()]);
  const initial = initialStateFrom(state, models, fabrics);
  if (!initial.initialLayout) notFound();

  return (
    <main>
      <h1 className="sr-only">Paylaşılan ORMEN kumaş kombinasyonu</h1>
      <Configurator models={models} fabrics={fabrics} {...initial} />
    </main>
  );
}
