import { requirePanelUser } from "@/lib/auth/panel";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { ActiveToggle } from "@/components/panel/ActiveToggle";
import { Badge, PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Firmalar" };

export default async function FirmsPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const repo = getRepository();
  const [firms, models, samples] = await Promise.all([repo.listFirms(), repo.listAllModels(), repo.listSampleRequests()]);
  return (
    <>
      <PageHeader title="Firmalar" eyebrow={`${firms.length} firma`}>
        <Link href="/panel/firmalar/yeni" className={buttonClass.primary}>
          Yeni firma
        </Link>
      </PageHeader>
      <p className="mb-4 text-[14px] text-antrasit-70">
        Her firmanın kendi logosu ve rengiyle bir sayfası olur: müşterisi firmanın modellerini ORMEN kumaşlarıyla dener, numune talebi firmaya ve panele gelir.
      </p>
      {firms.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">Henüz firma yok.</p>
      ) : (
        <ul className="divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
          {firms.map((f) => {
            const own = models.filter((m) => m.firmId === f.id).length;
            const requests = samples.filter((s) => s.firmSlug === f.slug).length;
            return (
              <li key={f.id} className="flex items-center gap-4 px-4 py-3">
                <span className="h-8 w-8 shrink-0 rounded-full border border-cizgi" style={{ background: f.accentColor }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={`/panel/firmalar/${f.id}`} className="block font-medium hover:underline">
                    {f.name}
                  </Link>
                  <span className="block text-[13px] text-antrasit-50">
                    /f/{f.slug} · {own ? `${own} özel model` : "vitrin modelleri"} · {requests} numune talebi
                  </span>
                </div>
                {!f.isActive && <Badge tone="off">yayında değil</Badge>}
                <ActiveToggle id={f.id} active={f.isActive} label={f.name} kind="firm" />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
