import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";

// One model of a firm, e.g. for a QR label on a showroom piece.

export async function generateMetadata({ params }: PageProps<"/f/[slug]/[model]">): Promise<Metadata> {
  const { slug, model } = await params;
  const cat = await loadCatalogue(slug);
  const m = cat?.models.find((x) => x.slug === model);
  if (!cat?.firm || !m) return { title: "Model bulunamadı" };
  return {
    title: `${m.name} · ${cat.firm.name}`,
    description: `${cat.firm.name} ${m.name} modelini ORMEN kumaşlarıyla görün, döndürün, numune isteyin.`,
    openGraph: { title: `${m.name} · ${cat.firm.name}`, description: "Kumaşlar: ORMEN TEKSTİL" },
  };
}

export default async function FirmModelPage({ params, searchParams }: PageProps<"/f/[slug]/[model]">) {
  const [{ slug, model }, sp] = await Promise.all([params, searchParams]);
  const cat = await loadCatalogue(slug);
  if (!cat?.firm || !cat.models.some((m) => m.slug === model) || cat.fabrics.length === 0) notFound();
  return (
    <main>
      <h1 className="sr-only">
        {cat.firm.name}: {cat.models.find((m) => m.slug === model)!.name}
      </h1>
      <Configurator models={cat.models} fabrics={cat.fabrics} firm={cat.firm} {...initialStateFrom({ ...sp, m: model }, cat.models, cat.fabrics)} />
    </main>
  );
}
