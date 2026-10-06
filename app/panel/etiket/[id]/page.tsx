import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRepository } from "@/lib/data";
import { requirePanelUser } from "@/lib/auth/panel";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { PrintButton } from "../../kart/[id]/PrintButton";

// Sample label, 100 × 70 mm, one per fabric of the request. ORMEN sticks it on
// the cut sample before it goes to the firm's shop. The QR opens /n/<code>,
// where the shop marks the sample as ordered (2nd meeting: the order is
// measured by the sample code, not the customer's phone). The lot is printed
// when ORMEN entered it, otherwise there is a box to write it in by hand.
// No personal data on the label.

export const metadata = { title: "Numune etiketi" };

export default async function SampleLabelPage({ params }: PageProps<"/panel/etiket/[id]">) {
  await requirePanelUser();
  const { id } = await params;
  const repo = getRepository();
  const req = await repo.getSampleRequest(decodeURIComponent(id));
  if (!req?.code) notFound();
  const [fabrics, firm] = await Promise.all([Promise.all(req.fabricCodes.map((c) => repo.getFabricByCode(c))), req.firmSlug ? repo.getFirmBySlug(req.firmSlug) : null]);
  const url = `${siteUrl()}/n/${req.code}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#00000000" } });
  const day = new Date(req.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: 100mm 70mm; margin: 0; } @media print { html, body { background: #fff !important; } .etiket { break-after: page; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[100mm] flex-col items-center gap-3 print:hidden">
        <PrintButton />
        <p className="text-center text-[13px] text-antrasit-70">
          Kumaş başına bir etiket ({req.fabricCodes.length}). Etiket yazıcısında kâğıdı 100 × 70 mm seçin; kenar boşluğu yok. Siyah beyaz basılır.
        </p>
        {!siteUrlIsFinal() && <p className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-center text-[13px] text-ceviz">QR geçici adresi gösteriyor; alan adı bağlanmadan bastırmayın.</p>}
      </div>
      <div className="flex flex-col items-center gap-6 print:block">
        {req.fabricCodes.map((code, i) => {
          const f = fabrics[i];
          return (
            <article
              key={code}
              className="etiket flex h-[70mm] w-[100mm] flex-col justify-between bg-white px-[6mm] py-[5mm] text-black shadow-lg print:shadow-none"
              data-testid="numune-etiketi"
            >
              <header className="flex items-baseline justify-between text-[7pt] tracking-[0.18em]">
                <span>ORMEN TEKSTİL · NUMUNE</span>
                <span className="max-w-[45mm] truncate tracking-normal">{firm ? firm.name : "ORMEN"}</span>
              </header>
              <div className="flex items-end justify-between gap-[4mm]">
                <div className="min-w-0">
                  <p className="font-sans text-[24pt] font-medium leading-none tracking-wide" translate="no">
                    {code}
                  </p>
                  {f && <p className="mt-[1.5mm] truncate text-[9pt]">{[f.series, f.colorName].filter(Boolean).join(" · ")}</p>}
                  <div className="mt-[4mm] flex items-center gap-[2mm] text-[9pt]">
                    <span>Lot</span>
                    {req.lot ? (
                      <span className="font-medium tracking-wide">{req.lot}</span>
                    ) : (
                      // written in by hand when the lot was not entered in the panel
                      <span className="inline-block h-[7mm] w-[34mm] border border-black" aria-label="Lot elle yazılacak" />
                    )}
                  </div>
                  <p className="mt-[2.5mm] text-[8pt]" translate="no">
                    {req.code} · {day}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-center gap-[1mm]">
                  <div className="h-[26mm] w-[26mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`${req.code} numune kodu QR`} />
                  <span className="text-[6pt]">Siparişte okutun</span>
                </div>
              </div>
              <footer className="border-t border-black pt-[1.5mm] text-[6.5pt] leading-snug">Renk onayı bu numune üzerinden verilir. Sipariş aynı lottan istenmelidir.</footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}
