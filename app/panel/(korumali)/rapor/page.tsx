import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { PageHeader, buttonClass, inputClass } from "@/components/panel/ui";
import { calibration } from "@/lib/cut-report";
import { formatMetres } from "@/lib/metraj";
import { sampleFunnel } from "@/lib/pilot-metrics";

export const metadata = { title: "Rapor" };

// Usage report: how many visits, which ORMEN fabrics are tried most, how
// each firm page performs. Built from anonymous events only.

const PERIODS = [
  ["7", "Son 7 gün"],
  ["30", "Son 30 gün"],
  ["90", "Son 90 gün"],
] as const;
const BAR = "#A8642A"; // single-series hue, validated against the panel surface
const nf = new Intl.NumberFormat("tr-TR");
const SOURCE_LABELS: Record<string, string> = {
  kiosk: "Showroom ekranı (kiosk)",
  qr: "Basılı QR (kart, afiş)",
  paylasim: "Paylaşılan kombinasyon",
  site: "Başka bir web sitesi",
  dogrudan: "Doğrudan bağlantı (WhatsApp, adres çubuğu)",
  bilinmiyor: "Kayıt yok (bu özellikten önce)",
};

export default async function ReportPage({ searchParams }: PageProps<"/panel/rapor">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const sp = await searchParams;
  const days = PERIODS.some(([d]) => d === sp.gun) ? Number(sp.gun) : 30;
  const firmParam = typeof sp.firma === "string" ? sp.firma : "";
  const repo = getRepository();
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  from.setUTCHours(0, 0, 0, 0);
  const [firms, fabrics] = await Promise.all([repo.listFirms(), repo.listFabrics({ includeInactive: true })]);
  const scope = firmParam === "" ? undefined : firmParam === "ormen" ? "" : firmParam;
  const [report, cutsAll, samplesAll] = await Promise.all([repo.eventReport(from, to, scope), repo.listCutReports(), repo.listSampleRequests()]);
  const funnel = sampleFunnel(samplesAll.filter((r) => r.createdAt >= from.toISOString() && (scope === undefined || (r.firmSlug ?? "") === scope)));
  const cuts = cutsAll.filter((c) => c.createdAt >= from.toISOString() && (scope === undefined || (c.firmSlug ?? "") === scope));
  const cal = calibration(cuts);
  const fabricByCode = new Map(fabrics.map((f) => [f.code, f]));
  const firmName = new Map(firms.map((f) => [f.slug, f.name]));
  const firmId = new Map(firms.map((f) => [f.slug, f.id]));
  const maxTries = Math.max(1, ...report.topFabrics.map((f) => f.tries));
  const maxDay = Math.max(1, ...report.days.map((d) => d.sessions));

  const per = (n: number, k = 1) => (report.sessions ? new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format((n / report.sessions) * k) : "–");
  // targets from REKABET-PLANI.md: ≥ 5 tries per visit, ≥ 3 sample requests per 100 visits
  const tiles = [
    ["Ziyaret", report.sessions, "konfigüratörü açan ayrı ziyaret"],
    ["Kumaş denemesi", report.counts.kumas_denendi, `ziyaret başına ${per(report.counts.kumas_denendi)} (hedef 5)`],
    ["AR", report.counts.ar_acildi, report.counts.ar_acilamadi ? `telefonda odada görme · ${nf.format(report.counts.ar_acilamadi)} kez açılamadı` : "telefonda odada görme"],
    ["Paylaşım", report.counts.paylasildi, "kombinasyon paylaşma"],
    // the room tools are frozen (2nd meeting); below 10% they are a candidate to simplify
    ["Oda / plan", report.roomSessions, `ziyaretlerin %${per(report.roomSessions, 100)}’i kullandı (ölçüt %10)`],
    ["Numune talebi", report.counts.numune_istendi, `100 ziyarette ${per(report.counts.numune_istendi, 100)} (hedef 3)`],
  ] as const;

  return (
    <>
      <PageHeader title="Rapor" eyebrow="Kullanım" />
      <form className="mb-6 flex flex-wrap items-end gap-3" role="search" aria-label="Rapor süzgeci">
        <label className="flex flex-col gap-1 text-[13px] text-antrasit-70">
          Dönem
          <select name="gun" defaultValue={String(days)} className={`${inputClass} w-44`}>
            {PERIODS.map(([d, l]) => (
              <option key={d} value={d}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-antrasit-70">
          Sayfa
          <select name="firma" defaultValue={firmParam} className={`${inputClass} w-60`}>
            <option value="">Hepsi</option>
            <option value="ormen">ORMEN ana sayfası</option>
            {firms.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClass.secondary}>
          Göster
        </button>
      </form>

      <p className="mb-4 text-[13px] text-antrasit-50">
        Kişisel veri tutulmaz: yalnızca rastgele bir ziyaret numarası, cihaz türü ve denenen kumaş. Panel kullanıcılarının ve otomatik testlerin ziyaretleri sayılmaz.
      </p>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="rapor-ozet">
        {tiles.map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-cizgi bg-kagit p-4">
            <dt className="text-[13px] text-antrasit-70">{label}</dt>
            <dd className="mt-1 font-sans text-[32px] font-medium leading-none tabular-nums">{nf.format(value)}</dd>
            <dd className="mt-1.5 text-[12px] text-antrasit-50">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="top-kumas">
          <h2 id="top-kumas" className="eyebrow mb-3">
            En çok denenen 10 kumaş
          </h2>
          {report.topFabrics.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-cizgi-koyu p-8 text-center text-[14px] text-antrasit-50">Bu dönemde kumaş denemesi yok.</p>
          ) : (
            <ol className="flex flex-col gap-2.5 rounded-2xl border border-cizgi bg-kagit p-4">
              {report.topFabrics.map((f) => {
                const fab = fabricByCode.get(f.code);
                return (
                  <li key={f.code} className="grid grid-cols-[9.5rem_1fr_3rem] items-center gap-3 text-[13px]" title={`${f.code}: ${f.tries} deneme, ${f.sessions} ziyarette`}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-4 w-4 shrink-0 rounded-full border border-cizgi" style={{ background: fab?.texture.avgColor ?? "#ccc" }} aria-hidden />
                      <span className="truncate font-medium tracking-wide">{f.code}</span>
                    </span>
                    <span className="h-3.5 rounded-r-[4px] bg-cizgi/50">
                      <span className="block h-full rounded-r-[4px]" style={{ width: `${(f.tries / maxTries) * 100}%`, background: BAR }} />
                    </span>
                    <span className="text-right tabular-nums text-antrasit-70">{nf.format(f.tries)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="gunluk">
          <h2 id="gunluk" className="eyebrow mb-3">
            Günlük ziyaret
          </h2>
          <div className="rounded-2xl border border-cizgi bg-kagit p-4">
            <svg viewBox={`0 0 ${report.days.length * 10} 100`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Günlük ziyaret sayısı">
              <line x1="0" x2={report.days.length * 10} y1="99.5" y2="99.5" stroke="#E3DDD2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              {report.days.map((d, i) => {
                const h = (d.sessions / maxDay) * 92;
                return (
                  <g key={d.day}>
                    {/* hit target: the whole column */}
                    <rect x={i * 10} y="0" width="10" height="100" fill="transparent">
                      <title>{`${new Date(d.day).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}: ${d.sessions} ziyaret`}</title>
                    </rect>
                    {d.sessions > 0 && <rect x={i * 10 + 1} y={100 - h} width="8" height={h} rx="1.5" fill={BAR} pointerEvents="none" />}
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-[11px] text-antrasit-50">
              <span>{new Date(report.days[0].day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
              <span>en yüksek: {nf.format(report.sessions ? maxDay : 0)}</span>
              <span>{new Date(report.days[report.days.length - 1].day).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-antrasit-70">
            Cihaz: {nf.format(report.devices.masaustu)} masaüstü · {nf.format(report.devices.telefon)} telefon · {nf.format(report.devices.tablet)} tablet
          </p>
        </section>
      </div>

      <section aria-labelledby="kaynaklar" className="mt-8">
        <h2 id="kaynaklar" className="eyebrow mb-3">
          Nereden geldiler
        </h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <BreakdownTable
            caption="Kaynak"
            rows={report.sources.map((x) => ({ key: x.source, label: SOURCE_LABELS[x.source] ?? x.source, sessions: x.sessions, samples: x.samples }))}
            empty="Bu dönemde ziyaret yok."
            testId="rapor-kaynak"
          />
          <BreakdownTable
            caption="Şube / kampanya etiketi"
            rows={report.tags.map((x) => ({ key: x.tag, label: x.tag, sessions: x.sessions, samples: x.samples }))}
            empty="Etiketli bağlantıdan gelen ziyaret yok. Etiket, Firmalar → firma → bağlantı ve QR bölümünde eklenir."
            testId="rapor-etiket"
          />
        </div>
        <p className="mt-2 text-[12px] text-antrasit-50">“100 ziyarette” oranı en az 30 ziyaret olunca gösterilir; daha azında yanıltıcı olur.</p>
      </section>

      <section aria-labelledby="akis" className="mt-8" data-testid="rapor-akis">
        <h2 id="akis" className="eyebrow mb-3">
          Numune akışı (pilot ölçümü)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["24 saati geçen", funnel.overdue, "hâlâ “Yeni”de bekleyen talep (hedef 0)"],
              ["Lot yazılan", funnel.shipped ? `${funnel.withLot}/${funnel.shipped}` : "–", "gönderilen numunelerde lot yazılı olan"],
              ["Gönderme süresi", funnel.sendHours === null ? "–" : `${nf.format(funnel.sendHours)} sa`, "talepten mağazaya çıkışa (şu an “gönderildi”dekiler, medyan)"],
              ["Siparişe döndü", funnel.shipped ? `${funnel.ordered}/${funnel.shipped}` : "–", `${funnel.notReturned} numune dönmedi`],
            ] as const
          ).map(([t, v, n]) => (
            <div key={t} className="rounded-2xl border border-cizgi bg-kagit p-4">
              <p className="text-[13px] text-antrasit-70">{t}</p>
              <p className="mt-1 font-display text-[30px] leading-none tabular-nums">{typeof v === "number" ? nf.format(v) : v}</p>
              <p className="mt-1.5 text-[12px] text-antrasit-50">{n}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-antrasit-50">Dönemde {nf.format(funnel.total)} talep. Metraj sapması aşağıda, kesim geri bildiriminde.</p>
      </section>

      <section aria-labelledby="kesim" className="mt-8" data-testid="rapor-kesim">
        <h2 id="kesim" className="eyebrow mb-3">
          Kesim geri bildirimi (usta föyü)
        </h2>
        <p className="mb-3 text-[13px] text-antrasit-70">
          Ustaların föydeki QR’dan yazdığı gerçek metre. {cal.total === 0 ? "Bu dönemde geri bildirim yok." : `${cal.total} kayıt; ${cal.withEstimate} tanesinde föyde sayı vardı, ${cal.short} tanesinde kumaş yetmedi${cal.meanDiffPct !== null ? `, ortalama fark %${new Intl.NumberFormat("tr-TR").format(cal.meanDiffPct)}` : ""}.`} Hesaplama ancak bu kayıtların büyük çoğunluğunda tutarsa devreye alınır.
        </p>
        {cuts.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-cizgi bg-kagit">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] text-antrasit-50">
                <tr className="border-b border-cizgi">
                  <th className="px-4 py-2 font-normal">Tarih</th>
                  <th className="px-4 py-2 font-normal">Kumaş</th>
                  <th className="px-4 py-2 font-normal">Modeller</th>
                  <th className="px-4 py-2 text-right font-normal">Föyde</th>
                  <th className="px-4 py-2 text-right font-normal">Gerçek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi tabular-nums">
                {cuts.slice(0, 30).map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{new Date(c.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}</td>
                    <td className="px-4 py-2 tracking-wide">{c.fabricCode}</td>
                    <td className="px-4 py-2 text-antrasit-70">{c.modelSlugs.join(", ")}</td>
                    <td className="px-4 py-2 text-right">{c.estimatedM !== null ? formatMetres(c.estimatedM) : "–"}</td>
                    <td className={`px-4 py-2 text-right ${c.estimatedM !== null && c.actualM > c.estimatedM ? "font-medium text-[#9a3b31]" : ""}`}>{formatMetres(c.actualM)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="firmalar" className="mt-8">
        <h2 id="firmalar" className="eyebrow mb-3">
          Sayfalara göre
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-cizgi bg-kagit">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12px] text-antrasit-50">
              <tr className="border-b border-cizgi">
                <th className="px-4 py-2 font-normal">Sayfa</th>
                {["Ziyaret", "Kumaş denemesi", "AR", "Paylaşım", "Numune"].map((h) => (
                  <th key={h} className="px-4 py-2 text-right font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi tabular-nums">
              {report.firms.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-antrasit-50">
                    Bu dönemde ziyaret yok.
                  </td>
                </tr>
              )}
              {report.firms.map((f) => (
                <tr key={f.slug ?? "ormen"}>
                  <td className="px-4 py-2">
                    {f.slug ? (firmName.get(f.slug) ?? f.slug) : "ORMEN ana sayfası"}
                    {f.slug && firmId.get(f.slug) && (
                      <a href={`/panel/ozet/${firmId.get(f.slug)}`} target="_blank" rel="noopener" className="ml-2 text-[12px] text-antrasit-70 underline underline-offset-2">
                        aylık özet
                      </a>
                    )}
                  </td>
                  {[f.sessions, f.tries, f.ar, f.shares, f.samples].map((v, i) => (
                    <td key={i} className="px-4 py-2 text-right">
                      {nf.format(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BreakdownTable({ caption, rows, empty, testId }: { caption: string; rows: { key: string; label: string; sessions: number; samples: number }[]; empty: string; testId: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-cizgi bg-kagit" data-testid={testId}>
      <table className="w-full text-left text-[14px]">
        <thead className="text-[12px] text-antrasit-50">
          <tr className="border-b border-cizgi">
            <th className="px-4 py-2 font-normal">{caption}</th>
            <th className="px-4 py-2 text-right font-normal">Ziyaret</th>
            <th className="px-4 py-2 text-right font-normal">Numune</th>
            <th className="px-4 py-2 text-right font-normal">100 ziyarette</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cizgi tabular-nums">
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-[13px] text-antrasit-50">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-4 py-2">{r.label}</td>
              <td className="px-4 py-2 text-right">{nf.format(r.sessions)}</td>
              <td className="px-4 py-2 text-right">{nf.format(r.samples)}</td>
              <td className="px-4 py-2 text-right text-antrasit-70">
                {/* too few visits make a rate meaningless */}
                {r.sessions >= 30 ? new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format((r.samples / r.sessions) * 100) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
