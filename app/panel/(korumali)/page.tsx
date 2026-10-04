import Link from "next/link";
import { getRepository } from "@/lib/data";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export default async function PanelHome() {
  const repo = getRepository();
  const [fabrics, models, firms, samples] = await Promise.all([
    repo.listFabrics({ includeInactive: true }),
    repo.listAllModels(),
    repo.listFirms(),
    repo.listSampleRequests(),
  ]);
  const cards = [
    { href: "/panel/kumaslar", title: "Kumaşlar", value: fabrics.filter((f) => f.isActive).length, note: `${fabrics.filter((f) => f.isPlaceholder).length} yer tutucu` },
    { href: "/panel/modeller", title: "Modeller", value: models.filter((m) => m.isActive).length, note: "vitrin ve firma modelleri" },
    { href: "/panel/firmalar", title: "Firmalar", value: firms.filter((f) => f.isActive).length, note: "kendi sayfası olan firma" },
    { href: "/panel/talepler", title: "Numune talepleri", value: samples.length, note: samples[0] ? `son: ${new Date(samples[0].createdAt).toLocaleDateString("tr-TR")}` : "henüz yok" },
  ];
  return (
    <>
      <PageHeader title="Genel bakış">
        <Link href="/panel/kumaslar/yeni" className={buttonClass.primary}>
          Yeni kumaş
        </Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-2xl border border-cizgi bg-kagit p-5 transition-colors hover:border-cizgi-koyu">
            <p className="eyebrow">{c.title}</p>
            <p className="mt-2 font-display text-[40px] leading-none">{c.value}</p>
            <p className="mt-2 text-[13px] text-antrasit-50">{c.note}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
