import { getRepository } from "@/lib/data";
import { prettyPhone, whatsappUrl } from "@/lib/samples";
import { PageHeader, buttonClass } from "@/components/panel/ui";

export const metadata = { title: "Numune talepleri" };

const when = (iso: string) => new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function RequestsPage() {
  const repo = getRepository();
  const requests = await repo.listSampleRequests();
  return (
    <>
      <PageHeader title="Numune talepleri" eyebrow={`${requests.length} talep`}>
        {requests.length > 0 && (
          <a href="/api/panel/talepler" className={buttonClass.secondary} download>
            Excel’e indir (CSV)
          </a>
        )}
      </PageHeader>
      {!repo.persistent && (
        <p className="mb-4 rounded-xl bg-[#F4E9DD] px-4 py-3 text-[14px] text-ceviz">
          Demo modundasınız: talepler sunucu yeniden başlayınca silinir. Supabase bağlanınca kalıcı olur.
        </p>
      )}
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cizgi-koyu p-10 text-center text-[15px] text-antrasit-50">
          Henüz numune talebi yok. Konfigüratördeki “Numune iste” düğmesinden gelen talepler burada listelenir.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-cizgi bg-kagit p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[16px] font-medium">{r.name}</p>
                <p className="text-[13px] text-antrasit-50">{when(r.createdAt)}</p>
              </div>
              <p className="mt-1 text-[14px] tracking-wide">{r.fabricCodes.join(" · ")}</p>
              {(!!r.firmSlug || !!r.modelSlugs?.length) && (
                <p className="mt-1 text-[13px] text-antrasit-50">
                  {r.firmSlug ? `Firma: ${r.firmSlug}` : "ORMEN ana sayfa"}
                  {r.modelSlugs?.length ? ` · ${r.modelSlugs.join(", ")}` : ""}
                </p>
              )}
              {r.note && <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[14px] text-antrasit-70">{r.note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${r.phone}`} className={buttonClass.quiet}>
                  {prettyPhone(r.phone)}
                </a>
                <a href={whatsappUrl(r.phone, `Merhaba ${r.name}, ORMEN TEKSTİL’den yazıyoruz. ${r.fabricCodes.join(", ")} numune talebiniz için…`)} target="_blank" rel="noopener" className={buttonClass.quiet}>
                  WhatsApp’tan yaz
                </a>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener" className={buttonClass.quiet}>
                    Seçimi aç
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
