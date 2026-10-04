import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { ModelEditor } from "@/components/panel/ModelEditor";
import { ParametricEditor } from "@/components/panel/ParametricEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni model" };

export default async function NewModelPage({ searchParams }: PageProps<"/panel/modeller/yeni">) {
  const sp = await searchParams;
  const repo = getRepository();
  const firm = typeof sp.firma === "string" ? await repo.getFirmById(sp.firma) : null;
  if (sp.firma && !firm) notFound();
  const fabrics = await repo.listFabrics();
  const eyebrow = firm ? `${firm.name} · firmaya özel` : "Modeller · ORMEN vitrini";
  const q = (tur: string) => `/panel/modeller/yeni?tur=${tur}${firm ? `&firma=${firm.id}` : ""}`;

  if (sp.tur === "secerek")
    return (
      <>
        <PageHeader title="Seçerek model oluştur" eyebrow={eyebrow} />
        <ParametricEditor fabrics={fabrics} firmId={firm?.id ?? null} />
      </>
    );
  if (sp.tur === "dosya")
    return (
      <>
        <PageHeader title="3D dosyadan model" eyebrow={eyebrow} />
        <ModelEditor fabrics={fabrics} firmId={firm?.id ?? null} />
      </>
    );

  return (
    <>
      <PageHeader title="Yeni model" eyebrow={eyebrow} />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href={q("secerek")} className="rounded-2xl border border-cizgi bg-kagit p-6 transition-colors hover:border-cizgi-koyu">
          <p className="eyebrow mb-2">3D dosya gerekmez</p>
          <p className="font-display text-[22px]">Seçerek oluştur</p>
          <p className="mt-2 text-[14px] leading-snug text-antrasit-70">
            Kanepe, köşe takımı, berjer ya da puf. Kol, sırt, ayak ve ölçüleri seçin; model bir dakikada hazır. Atölyede 3D model yoksa bunu kullanın.
          </p>
        </Link>
        <Link href={q("dosya")} className="rounded-2xl border border-cizgi bg-kagit p-6 transition-colors hover:border-cizgi-koyu">
          <p className="eyebrow mb-2">Firmanın kendi modeli</p>
          <p className="font-display text-[22px]">3D dosya (.glb) yükle</p>
          <p className="mt-2 text-[14px] leading-snug text-antrasit-70">Modelleme programından çıkmış, ürünün birebir 3D modeli varsa. En gerçekçi sonuç bununla alınır.</p>
        </Link>
      </div>
    </>
  );
}
