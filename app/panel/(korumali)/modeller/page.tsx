import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { describeParams } from "@/lib/parametric/spec";
import { ActiveToggle } from "@/components/panel/ActiveToggle";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Modeller" };

export default async function ModelsPage({ searchParams }: PageProps<"/panel/modeller">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const sp = await searchParams;
  const saved = typeof sp.kaydedildi === "string" ? sp.kaydedildi : null;
  const models = (await getRepository().listAllModels()).filter((m) => m.firmId === null);

  return (
    <>
      <PageHeader title="Modeller" eyebrow={`${models.length} vitrin modeli`}>
        <Link href="/panel/modeller/yeni" className={buttonClass.primary}>
          Yeni model
        </Link>
      </PageHeader>
      {saved && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {saved} kaydedildi.
        </p>
      )}
      <p className="mb-4 text-[14px] text-antrasit-70">
        Burada ORMEN’in herkese açık konfigüratöründeki modeller var. Firmalara özel modeller, firma sayfaları gelince firmanın kendi sayfasından eklenecek.
      </p>
      <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
        {models.map((m) => (
          <li key={m.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              {m.source.kind !== "procedural" ? (
                <Link href={`/panel/modeller/${m.id}`} className="block font-medium hover:underline">
                  {m.name}
                </Link>
              ) : (
                <span className="block font-medium">{m.name}</span>
              )}
              <span className="block text-[13px] text-antrasit-50">
                {m.source.kind === "parametric"
                  ? `${describeParams(m.source.params)} · ${m.dimensionsCm.h} cm yükseklik`
                  : `${m.dimensionsCm.w} × ${m.dimensionsCm.d} × ${m.dimensionsCm.h} cm · kumaş: ${m.fabricMaterialNames.join(", ")}`}
              </span>
            </div>
            {m.source.kind === "procedural" && <Badge>kodla üretilen örnek</Badge>}
            {m.source.kind === "parametric" && <Badge>seçerek oluşturuldu</Badge>}
            {!m.isActive && <Badge tone="off">gizli</Badge>}
            <ActiveToggle id={m.id} active={m.isActive} label={m.name} kind="model" />
          </li>
        ))}
      </ul>
    </>
  );
}
