import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { requirePanelUser } from "@/lib/auth/panel";
import { MIN_VISITS, monthRange, recentMonths } from "@/lib/monthly";
import { PrintButton } from "../../kart/[id]/PrintButton";

// Monthly one-page summary for a firm (1st meeting, Selin and Ece), printed
// by ORMEN's salesperson and handed over on a visit. Counts only, no personal
// data. Below MIN_VISITS visits no ranking is shown.

export const metadata = { title: "Aylık özet" };

const SOURCE_LABELS: Record<string, string> = {
  kiosk: "Showroom ekranı",
  qr: "Basılı QR (kart, askı)",
  paylasim: "Paylaşılan kombinasyon",
  site: "Web siteniz ya da başka bir site",
  dogrudan: "Doğrudan bağlantı (WhatsApp vb.)",
  bilinmiyor: "Kaydı yok",
};
const nf = new Intl.NumberFormat("tr-TR");

export default async function MonthlySummaryPage({ params, searchParams }: PageProps<"/panel/ozet/[id]">) {
  await requirePanelUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const repo = getRepository();
  const firm = await repo.getFirmById(decodeURIComponent(id));
  if (!firm) notFound();
  const months = recentMonths(6);
  // default: the last full month (the visit is usually at the start of the next)
  const ym = typeof sp.ay === "string" && months.includes(sp.ay) ? sp.ay : months[1];
  const range = monthRange(ym)!;
  const [report, samples, fabrics] = await Promise.all([repo.eventReport(range.from, range.to, firm.slug), repo.listSampleRequests(), repo.listFabrics({ includeInactive: true })]);
  const inMonth = samples.filter((s) => s.firmSlug === firm.slug && s.createdAt >= range.from.toISOString() && s.createdAt <= range.to.toISOString());
  const ordered = inMonth.filter((s) => s.status === "siparis").length;
  const byCode = new Map(fabrics.map((f) => [f.code, f]));
  const enough = report.sessions >= MIN_VISITS;

  const tiles = [
    ["Ziyaret", report.sessions],
    ["Kumaş denemesi", report.counts.kumas_denendi],
    ["Odamda gör (AR)", report.counts.ar_acildi],
    ["Numune talebi", inMonth.length],
    ["Siparişe dönen numune", ordered],
  ] as const;

  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <nav className="mx-auto mb-6 flex max-w-[182mm] flex-wrap items-center gap-2 print:hidden" aria-label="Ay">
        {months.map((m) => (
          <Link
            key={m}
            href={`?ay=${m}`}
            aria-current={m === ym ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${m === ym ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white"}`}
          >
            {monthRange(m)!.label}
          </Link>
        ))}
        <span className="ml-auto">
          <PrintButton />
        </span>
      </nav>

      <article className="mx-auto flex min-h-[269mm] w-[182mm] flex-col bg-white p-[10mm] text-antrasit shadow-lg print:min-h-0 print:p-0 print:shadow-none" data-testid="aylik-ozet">
        <header className="flex items-end justify-between border-b border-cizgi pb-4" style={{ borderTop: `3mm solid ${firm.accentColor}`, paddingTop: "4mm" }}>
          <div>
            {firm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={firm.logoUrl} alt={firm.name} className="max-h-[14mm] max-w-[60mm] object-contain" />
            ) : (
              <p className="font-display text-[22px]">{firm.name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-[20px]">Showroomunuzda {range.label}</p>
            <p className="text-[11px] text-antrasit-50">ORMEN Atelier kullanım özeti</p>
          </div>
        </header>

        <dl className="mt-6 grid grid-cols-5 gap-3">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-cizgi p-3">
              <dt className="text-[11px] text-antrasit-70">{label}</dt>
              <dd className="mt-1 font-sans text-[24px] font-medium leading-none tabular-nums">{nf.format(value)}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <h2 className="eyebrow mb-3">En çok denenen kumaşlar</h2>
          {!enough ? (
            <p className="rounded-xl border border-dashed border-cizgi-koyu p-6 text-center text-[13px] text-antrasit-70">
              Bu ay {nf.format(report.sessions)} ziyaret var. Sıralama {MIN_VISITS} ziyaretten sonra gösterilir; daha azında yanıltıcı olur.
            </p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-antrasit-50">
                <tr className="border-b border-cizgi">
                  <th className="py-1.5 font-normal">#</th>
                  <th className="py-1.5 font-normal">Kumaş</th>
                  <th className="py-1.5 text-right font-normal">Deneme</th>
                  <th className="py-1.5 text-right font-normal">Kaç ziyarette</th>
                </tr>
              </thead>
              <tbody>
                {report.topFabrics.map((t, i) => {
                  const f = byCode.get(t.code);
                  return (
                    <tr key={t.code} className="border-b border-cizgi">
                      <td className="py-1.5 tabular-nums text-antrasit-50">{i + 1}</td>
                      <td className="py-1.5">
                        <span className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {f && <img src={f.texture.thumbUrl} alt="" className="h-7 w-7 rounded-full" />}
                          <span className="font-medium tracking-wide">{t.code}</span>
                          {f && (
                            <span className="text-antrasit-70">
                              {f.series} · {f.colorName}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{nf.format(t.tries)}</td>
                      <td className="py-1.5 text-right tabular-nums">{nf.format(t.sessions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {report.sources.length > 0 && (
          <section className="mt-8">
            <h2 className="eyebrow mb-3">Ziyaretler nereden geldi</h2>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
              {report.sources.map((s) => (
                <li key={s.source} className="flex justify-between border-b border-cizgi py-1">
                  <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                  <span className="tabular-nums">{nf.format(s.sessions)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto border-t border-cizgi pt-3 text-[10px] leading-snug text-antrasit-50">
          Kişisel veri içermez: ziyaretler rastgele bir numarayla sayılır. Kumaşlar ORMEN TEKSTİL. Kartela ve top siparişleriniz için ORMEN satış temsilcinize danışın.
        </footer>
      </article>
    </main>
  );
}
