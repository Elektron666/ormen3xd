import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRepository, loadCatalogue } from "@/lib/data";
import { requirePanelUser } from "@/lib/auth/panel";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { cleanTag, markedPath } from "@/lib/source";
import { PrintButton } from "./PrintButton";

// A6 counter card for a firm's showroom: logo, a short line, a large QR.
// Printed from the browser ("PDF olarak kaydet"), like the offer sheet.

export const metadata = { title: "A6 kart" };

export default async function FirmCardPage({ params, searchParams }: PageProps<"/panel/kart/[id]">) {
  await requirePanelUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const firm = await getRepository().getFirmById(decodeURIComponent(id));
  if (!firm) notFound();
  const cat = await loadCatalogue(firm.slug);
  const modelSlug = typeof sp.model === "string" ? sp.model : null;
  const model = modelSlug ? cat?.models.find((m) => m.slug === modelSlug) : null;
  if (modelSlug && !model) notFound();
  const path = `/f/${firm.slug}${model ? `/${model.slug}` : ""}`;
  const url = `${siteUrl()}${path}`;
  // the code itself carries ?q (and the branch label) so card visits are counted as "QR"
  const qrUrl = `${siteUrl()}${markedPath(path, { qr: true, tag: cleanTag(typeof sp.etiket === "string" ? sp.etiket : null) })}`;
  const qr = await QRCode.toString(qrUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2A2A28", light: "#00000000" } });

  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: 105mm 148mm; margin: 0; } @media print { html, body { background: #fff !important; height: 148mm; overflow: hidden; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[105mm] flex-col items-center gap-3 print:hidden">
        <PrintButton />
        <p className="text-center text-[13px] text-antrasit-70">Yazdırma penceresinde kâğıt boyutunu A6 seçin ya da “PDF olarak kaydet” deyin. Kenar boşluğu: yok.</p>
        {!siteUrlIsFinal() && (
          <p className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-center text-[13px] text-ceviz">QR geçici adresi gösteriyor; alan adı bağlanmadan bastırmayın.</p>
        )}
      </div>
      <article
        className="mx-auto flex h-[148mm] w-[105mm] flex-col items-center justify-between bg-white px-[10mm] pb-[8mm] pt-[11mm] text-center text-antrasit shadow-lg print:overflow-hidden print:shadow-none"
        style={{ borderTop: `4mm solid ${firm.accentColor}` }}
      >
        <div className="flex h-[18mm] items-center justify-center">
          {firm.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firm.logoUrl} alt={firm.name} className="max-h-[18mm] max-w-[70mm] object-contain" />
          ) : (
            <span className="font-display text-[22pt]">{firm.name}</span>
          )}
        </div>
        <div>
          <p className="font-display text-[17pt] leading-tight">{model ? `${model.name} hangi kumaşla daha güzel?` : "Koltuğunuzu kumaşıyla birlikte görün"}</p>
          <p className="mt-[3mm] text-[9.5pt] leading-snug text-antrasit-70">Telefonunuzun kamerasıyla okutun. Kumaşları tek dokunuşla değiştirin, odanıza göre bakın, numune isteyin.</p>
        </div>
        <div className="h-[56mm] w-[56mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`${url} için QR kod`} />
        <div className="w-full">
          <p className="break-all text-[8pt] text-antrasit-50">{url.replace(/^https?:\/\//, "")}</p>
          <p className="mt-[3mm] border-t border-cizgi pt-[2.5mm] text-[7.5pt] tracking-[0.2em] text-antrasit-50">KUMAŞLAR: ORMEN TEKSTİL</p>
        </div>
      </article>
    </main>
  );
}
