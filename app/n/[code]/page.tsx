import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { SAMPLE_STEPS, canMarkOrdered, cleanSampleCode, whatsappUrl } from "@/lib/samples";
import { markOrderedAction } from "./actions";

// What the QR on a sample label opens. Public, so it shows nothing about the
// customer: only the sample, its lot and the shop it went to.

export const metadata: Metadata = { title: "Numune", robots: { index: false, follow: false } };

export default async function SamplePage({ params, searchParams }: PageProps<"/n/[code]">) {
  const [{ code: raw }, sp] = await Promise.all([params, searchParams]);
  const code = cleanSampleCode(decodeURIComponent(raw));
  if (!code) notFound();
  const repo = getRepository();
  const req = await repo.getSampleByCode(code);
  if (!req) notFound();
  const [fabrics, firm] = await Promise.all([Promise.all(req.fabricCodes.map((c) => repo.getFabricByCode(c))), req.firmSlug ? repo.getFirmBySlug(req.firmSlug) : null]);
  const ormen = process.env.NEXT_PUBLIC_ORMEN_WHATSAPP;
  const ordered = req.status === "siparis";
  const notice = [
    "ORMEN sipariş ön bildirimi",
    `Numune: ${req.code}`,
    `Kumaş: ${req.fabricCodes.join(", ")}`,
    `Lot: ${req.lot ?? "numune etiketinde"}`,
    `Mağaza: ${firm?.name ?? "—"}`,
    "Aynı lottan metraj durumu için dönüş rica ederiz.",
  ].join("\n");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-kirik-beyaz px-5 py-10 text-antrasit">
      <header>
        <p className="eyebrow">ORMEN TEKSTİL · Numune</p>
        <h1 className="mt-2 font-display text-[30px] leading-tight" translate="no">
          {req.code}
        </h1>
        <p className="mt-1 text-[14px] text-antrasit-70">
          {firm ? `${firm.name} mağazası için` : "ORMEN"} · {new Date(req.createdAt).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} ·{" "}
          <span data-testid="numune-adim">{SAMPLE_STEPS[req.status]}</span>
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {req.fabricCodes.map((c, i) => {
          const f = fabrics[i];
          return (
            <li key={c} className="flex items-center gap-3 rounded-2xl border border-cizgi bg-kagit p-3">
              {f && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.texture.thumbUrl} alt="" className="h-12 w-12 rounded-full" />
              )}
              <div>
                <p className="font-medium tracking-wide" translate="no">
                  {c}
                </p>
                {f && <p className="text-[13px] text-antrasit-70">{[f.series, f.colorName].join(" · ")}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[15px]">
        Lot: <strong>{req.lot ?? "numune etiketinde elle yazılı"}</strong>
        <span className="mt-1 block text-[13px] text-antrasit-70">Sipariş aynı lottan istenmelidir; farklı partiler arasında ton farkı olabilir.</span>
      </p>

      {"bildirildi" in sp || ordered ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-[#E8EFE6] p-4 text-[15px] text-[#35523a]" role="status">
          <p>Bu numune siparişe dönmüş olarak ORMEN’e bildirildi.</p>
          {ormen && (
            <a
              href={whatsappUrl(ormen, notice)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-full bg-antrasit text-[15px] text-kagit hover:bg-ceviz"
            >
              ORMEN’e metraj ve lot için yaz
            </a>
          )}
        </div>
      ) : canMarkOrdered(req.status) ? (
        <form action={markOrderedAction} className="flex flex-col gap-2">
          <input type="hidden" name="code" value={req.code} />
          <button type="submit" className="h-12 rounded-full bg-antrasit text-[15px] text-kagit hover:bg-ceviz focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit">
            Bu numuneyle sipariş verildi
          </button>
          <p className="text-[13px] text-antrasit-70">Mağaza için: sipariş kesinleşince basın. ORMEN hangi numunelerin siparişe döndüğünü böyle görür; müşteri bilgisi istenmez.</p>
        </form>
      ) : null}

      <p className="mt-auto text-center text-[12px] text-antrasit-50">Renk onayı bu numune üzerinden verilir. Ekran renkleri bağlayıcı değildir.</p>
    </main>
  );
}
