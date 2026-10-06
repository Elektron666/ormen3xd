import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getRepository, loadCatalogue } from "@/lib/data";
import { requirePanelUser } from "@/lib/auth/panel";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";
import { cleanTag, markedPath } from "@/lib/source";
import { PrintButton } from "../../kart/[id]/PrintButton";

// Hanger labels (1st meeting, Selin): one small label per fabric the firm
// offers, for the swatch hangers in its showroom. Scanning one opens the firm's
// page with that fabric already on the sofa, counted as "QR" in the report.
// A4 sheet of 3 × 8 labels (63.5 × 33.9 mm, the common L7159 sticker sheet).

export const metadata = { title: "Askı etiketleri" };

export default async function HangerLabelsPage({
  params,
  searchParams,
}: PageProps<"/panel/aski/[id]">) {
  await requirePanelUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const firm = await getRepository().getFirmById(decodeURIComponent(id));
  if (!firm) notFound();
  const cat = await loadCatalogue(firm.slug);
  if (!cat) notFound();
  const tag =
    cleanTag(typeof sp.etiket === "string" ? sp.etiket : null) ?? "aski";
  const labels = await Promise.all(
    cat.fabrics.map(async (f) => {
      const url = `${siteUrl()}${markedPath(`/f/${firm.slug}`, { qr: true, fabric: f.code, tag })}`;
      return {
        fabric: f,
        url,
        qr: await QRCode.toString(url, {
          type: "svg",
          margin: 0,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#00000000" },
        }),
      };
    }),
  );

  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 13mm 7mm; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[196mm] flex-col items-center gap-3 print:hidden">
        <PrintButton />
        <p className="text-center text-[13px] text-antrasit-70">
          {labels.length} etiket, A4 başına 24 (3 × 8, 63,5 × 33,9 mm; L7159
          tipi etiket kâğıdı). Yazdırırken ölçek %100, kenar boşlukları
          “varsayılan”. Ziyaretler raporda “{tag}” etiketiyle sayılır.
        </p>
        {!siteUrlIsFinal() && (
          <p className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-center text-[13px] text-ceviz">
            QR geçici adresi gösteriyor; alan adı bağlanmadan bastırmayın.
          </p>
        )}
      </div>
      <div className="mx-auto grid w-[196mm] grid-cols-3 gap-x-[2.5mm] bg-white print:bg-transparent">
        {labels.map(({ fabric: f, url, qr }) => (
          <article
            key={f.code}
            className="flex h-[33.9mm] items-center gap-[3mm] px-[3mm] text-black [break-inside:avoid]"
            data-testid="aski-etiketi"
          >
            <div
              className="h-[24mm] w-[24mm] shrink-0 [&>svg]:h-full [&>svg]:w-full"
              data-href={url}
              dangerouslySetInnerHTML={{ __html: qr }}
              role="img"
              aria-label={`${f.code} QR`}
            />
            <div className="min-w-0">
              <p
                className="truncate font-sans text-[13pt] font-medium leading-tight tracking-wide"
                translate="no"
              >
                {f.code}
              </p>
              <p className="truncate text-[7.5pt]">
                {f.series} · {f.colorName}
              </p>
              <p className="mt-[1.5mm] text-[6.5pt] leading-tight">
                Okutun, koltukta görün
              </p>
              <p className="truncate text-[6pt] tracking-[0.12em]">
                {firm.name.toLocaleUpperCase("tr-TR")}
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
