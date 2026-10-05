import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { headers } from "next/headers";
import { gatherSetupFacts } from "@/lib/setup-facts";
import { evaluateSetup, overall } from "@/lib/setup-check";
import { getRepository } from "@/lib/data";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export default async function PanelHome() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
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
  const setup = overall(evaluateSetup(await gatherSetupFacts((await headers()).get("host"))));
  return (
    <>
      {(setup === "error" || setup === "warn") && (
        <Link href="/panel/durum" className="mb-6 block rounded-xl border border-[#e7c3bd] bg-[#fbeeec] px-4 py-3 text-[14px] hover:border-[#b4483c]">
          Kurulumda {setup === "error" ? "yapılması gereken" : "eksik"} adımlar var. <span className="underline">Kurulum durumunu gör</span>
        </Link>
      )}
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
