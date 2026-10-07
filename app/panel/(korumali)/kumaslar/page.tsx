import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { FABRIC_TYPE_LABELS, codeUpper } from "@/lib/i18n/tr";
import { ActiveToggle } from "@/components/panel/ActiveToggle";
import { HidePlaceholders } from "@/components/panel/HidePlaceholders";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Kumaşlar" };

export default async function FabricsPage({ searchParams }: PageProps<"/panel/kumaslar">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const sp = await searchParams;
  const saved = typeof sp.kaydedildi === "string" ? codeUpper(sp.kaydedildi) : null;
  const imported = typeof sp.aktarildi === "string" ? Number(sp.aktarildi) : null;
  const fabrics = await getRepository().listFabrics({ includeInactive: true });
  const placeholders = fabrics.filter((f) => f.isPlaceholder).length;
  const livePlaceholders = fabrics.filter((f) => f.isPlaceholder && f.isActive).length;

  return (
    <>
      <PageHeader title="Kumaşlar" eyebrow={`${fabrics.length} kumaş · ${fabrics.filter((f) => f.isActive).length} yayında`}>
        <Link href="/panel/kumaslar/toplu" className={buttonClass.secondary}>
          Toplu ekle (CSV)
        </Link>
        <Link href="/panel/kumaslar/yeni" className={buttonClass.primary}>
          Yeni kumaş
        </Link>
      </PageHeader>

      {saved && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {saved} kaydedildi. Konfigüratörde hemen görünür.
        </p>
      )}
      {imported !== null && Number.isFinite(imported) && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {imported} kumaş aktarıldı.
        </p>
      )}
      {placeholders > 0 && (
        <div className="mb-4 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[14px] text-ceviz">
          {placeholders} kumaş hâlâ <strong>yer tutucu</strong>: görselleri bilgisayarda üretilmiş örneklerdir. Gerçek kumaş fotoğrafını yükleyince bu
          işaret kalkar.
          {livePlaceholders > 0 && <HidePlaceholders count={livePlaceholders} />}
        </div>
      )}

      <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
        {fabrics.map((f) => (
          <li key={f.id} className="flex items-center gap-4 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnails from our own storage */}
            <img src={f.texture.thumbUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg border border-cizgi object-cover" />
            <Link href={`/panel/kumaslar/${f.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block font-medium tracking-wide">{f.code}</span>
              <span className="block truncate text-[13px] text-antrasit-50">
                {f.series} · {f.colorName} · {FABRIC_TYPE_LABELS[f.type]}
              </span>
            </Link>
            <span className="hidden gap-1.5 sm:flex">
              {f.isPlaceholder && <Badge tone="warn">yer tutucu</Badge>}
              {!f.isActive && <Badge tone="off">gizli</Badge>}
            </span>
            <ActiveToggle id={f.id} active={f.isActive} label={f.code} />
          </li>
        ))}
      </ul>
    </>
  );
}
