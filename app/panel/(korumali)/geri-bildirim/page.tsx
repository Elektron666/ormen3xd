import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { FEEDBACK_KINDS, FEEDBACK_LABELS } from "@/lib/feedback";
import { FeedbackDelete } from "@/components/panel/FeedbackDelete";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Geri bildirim" };

const when = (iso: string) => new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const DEVICE = { telefon: "telefon", tablet: "tablet", masaustu: "bilgisayar" } as const;

export default async function FeedbackPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const repo = getRepository();
  const [items, firms] = await Promise.all([repo.listFeedback(), repo.listFirms()]);
  const firmName = new Map(firms.map((f) => [f.slug, f.name]));
  const counts = FEEDBACK_KINDS.map((k) => [k, items.filter((i) => i.kind === k).length] as const);
  return (
    <>
      <PageHeader title="Geri bildirim" eyebrow={`${items.length} mesaj`} />
      <p className="-mt-2 mb-6 max-w-2xl text-[14px] text-antrasit-70">
        Sitedeki “Geri bildirim” bağlantısından gelen mesajlar. İsimsizdir: ad, telefon, e-posta ya da IP adresi kaydedilmez.
      </p>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi p-8 text-center text-[14px] text-antrasit-50">Henüz mesaj yok.</p>
      ) : (
        <>
          <ul className="mb-5 flex flex-wrap gap-2 text-[13px]">
            {counts.map(([k, n]) => (
              <li key={k} className="rounded-full border border-cizgi px-3 py-1">
                {FEEDBACK_LABELS[k]}: <strong className="font-medium">{n}</strong>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3">
            {items.map((f) => (
              <li key={f.id} className="rounded-2xl border border-cizgi bg-kagit p-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-antrasit-50">
                  <span className="rounded-full bg-antrasit px-2.5 py-0.5 text-kagit">{FEEDBACK_LABELS[f.kind]}</span>
                  <span>{when(f.createdAt)}</span>
                  {f.firmSlug && <span>{firmName.get(f.firmSlug) ?? f.firmSlug} sayfası</span>}
                  {f.page && f.page !== "/" && <span>{f.page}</span>}
                  {f.device && <span>{DEVICE[f.device]}</span>}
                  <span className="ml-auto">
                    <FeedbackDelete id={f.id} />
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{f.message}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
