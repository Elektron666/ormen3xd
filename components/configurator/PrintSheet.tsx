"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import type { RoomSpec } from "@/lib/room/spec";
import { FABRIC_TYPE_LABELS } from "@/lib/i18n/tr";
import { PlanSvg, type PlanSvgPiece } from "./PlanSvg";
import { ZONED_REASON, estimate, formatMetres, meterageByFabric } from "@/lib/metraj";
import type { FabricPart } from "@/lib/three/zones";
import { encodeCutJob } from "@/lib/cut-report";
import { BrandMark } from "./BrandMark";

// "Teklif föyü": an A4 the furniture shop hands to the customer, plus a
// second, grey page for the workshop ("usta föyü", 2nd meeting).
// Rendered off-screen and shown only when printing; the browser's
// "Save as PDF" turns it into a PDF with correct Turkish typography.

export interface PrintData {
  snapshot: string;
  url: string;
  room: RoomSpec;
  pieces: (PlanSvgPiece & { model: FurnitureModel; parts?: FabricPart<Fabric>[] })[];
  firm?: Firm | null;
}

function useQr(url: string): string {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#2a2a28", light: "#00000000" } })
      .then((s) => alive && setSvg(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url]);
  return svg;
}

function Sheet({ data }: { data: PrintData }) {
  const qr = useQr(data.url);
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="foy-sheet mx-auto flex flex-col bg-white text-antrasit">
      <header className="flex items-end justify-between border-b border-cizgi pb-4">
        <BrandMark firm={data.firm} />
        <div className="text-right">
          <p className="font-display text-[20px]">Kumaş ve yerleşim föyü</p>
          <p className="text-[11px] text-antrasit-50">{today}</p>
        </div>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.snapshot} alt="Seçilen kombinasyonun görünümü" className="foy-shot mt-4 w-full rounded-md object-contain" />

      <section className="mt-5 grid grid-cols-[1.25fr_1fr] gap-6">
        <table className="w-full self-start text-left text-[11px]">
          <thead>
            <tr className="border-b border-cizgi text-[10px] uppercase tracking-[0.12em] text-antrasit-50">
              <th className="py-1.5 font-normal">Mobilya</th>
              <th className="py-1.5 font-normal">Kumaş</th>
            </tr>
          </thead>
          <tbody>
            {rowsOf(data).map(({ key, model, fabric, label }) => (
              <tr key={key} className="border-b border-cizgi align-top">
                <td className="py-2 pr-3">
                  <p className="text-[12px] text-antrasit">{model.name}</p>
                  {label && <p className="text-antrasit-70">{label}</p>}
                  <p className="text-antrasit-50">
                    {model.dimensionsCm.w} × {model.dimensionsCm.d} × {model.dimensionsCm.h} cm
                  </p>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fabric.texture.thumbUrl} alt="" className="h-9 w-9 rounded-full" />
                    <div>
                      <p className="font-display text-[17px] leading-tight">{fabric.code}</p>
                      <p className="text-antrasit-70">
                        {fabric.series} · {fabric.colorName} · {FABRIC_TYPE_LABELS[fabric.type]}
                      </p>
                      {fabric.composition && <p className="text-antrasit-50">{fabric.composition}</p>}
                      {fabric.martindale && <p className="text-antrasit-50">Martindale {fabric.martindale.toLocaleString("tr-TR")}</p>}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col">
          <PlanSvg room={data.room} pieces={data.pieces} className="foy-plan w-full" />
          <p className="mt-1 text-center text-[10px] text-antrasit-50">Plan, ölçüler cm</p>
        </div>
      </section>

      <footer className="mt-auto flex items-end justify-between gap-6 border-t border-cizgi pt-4">
        <div className="flex items-center gap-4">
          <div className="h-[26mm] w-[26mm]" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="text-[11px] leading-snug">
            <p className="text-[13px] text-antrasit">Bu kombinasyonu telefonunuzda açın</p>
            <p className="text-antrasit-70">Döndürün, odanızda görün, numune isteyin.</p>
          </div>
        </div>
        <div className="max-w-[70mm] text-right text-[10px] leading-snug text-antrasit-50">
          <p className="tracking-[0.12em] uppercase">Kumaşlar: ORMEN TEKSTİL</p>
          <p>Ekran ve baskı renkleri gerçek kumaştan farklı olabilir ve bağlayıcı değildir. Renk onayı numune üzerinden verilir.</p>
        </div>
      </footer>
    </article>
  );
}

/**
 * Page 2, for the workshop: per fabric the firm's metres (or why there is no
 * number), a box for the lot, a box the shop staples the approved sample into
 * with the customer's signature, and a line for the metres really cut. The QR
 * opens /gercek-metre/<job>, where the upholsterer types that figure in.
 * Black on white on purpose: colour is judged on the stapled sample, not on paper.
 */
/** One row per fabric a piece wears (a piece in one fabric is one row). */
function rowsOf(data: PrintData) {
  return data.pieces.flatMap(({ p, model, fabric, parts }) =>
    (parts ?? [{ fabric, label: null, zoned: false }]).map((part, i) => ({ key: `${p.id}:${i}`, model, fabric: part.fabric, label: part.label, zoned: part.zoned })),
  );
}

function CutterSheet({ data }: { data: PrintData }) {
  const rows = rowsOf(data);
  const groups = meterageByFabric(rows.map(({ model, fabric, zoned }) => ({ model, fabric, zoned })));
  const job = encodeCutJob({
    firm: data.firm?.slug ?? null,
    rows: groups.map((g) => ({ code: g.fabric.code, models: [...new Set(rows.filter((x) => x.fabric.code === g.fabric.code).map((x) => x.model.slug))], estimate: g.total })),
  });
  const feedbackUrl = `${new URL(data.url).origin}/gercek-metre/${job}`;
  const qr = useQr(feedbackUrl);
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const fabricLine = (f: (typeof groups)[number]["fabric"]) =>
    [
      f.widthCm ? `En ${f.widthCm} cm` : "En ?",
      f.pattern === "duz" ? "düz" : f.pattern === "desenli" ? `desenli${f.patternRepeatCm ? ` (rapor ${f.patternRepeatCm.w} × ${f.patternRepeatCm.h} cm)` : ""}` : "desen ?",
      f.cutDirection === "tek" ? "tek yön" : f.cutDirection === "cift" ? "çift yön" : "yön ?",
    ].join(" · ");

  return (
    <article className="foy-sheet foy-usta mx-auto flex flex-col bg-white text-black" data-testid="usta-foyu">
      <header className="flex items-end justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-[10px] tracking-[0.2em]">USTA FÖYÜ · ATÖLYE İÇİN</p>
          <p className="font-display text-[20px]">{data.firm?.name ?? "ORMEN TEKSTİL"}</p>
        </div>
        <p className="text-[11px]">{today}</p>
      </header>
      <p className="mt-3 border-2 border-black px-3 py-2 text-center text-[13px] font-medium tracking-[0.08em]">METRAJ TAHMİNİDİR, USTA TEYİT EDER</p>

      <table className="mt-4 w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-black text-[9.5px] uppercase tracking-[0.12em]">
            <th className="py-1.5 font-normal">Mobilya</th>
            <th className="py-1.5 font-normal">Kumaş</th>
            <th className="py-1.5 text-right font-normal">Firmanın metrajı</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, model, fabric, label, zoned }) => {
            const e = zoned ? ({ kind: "usta", reason: ZONED_REASON } as const) : estimate(model, fabric);
            return (
              <tr key={key} className="border-b border-black/30 align-top">
                <td className="py-1.5 pr-3">
                  {model.name}
                  {label && <span className="block text-[10px] font-medium">{label}</span>}
                  <span className="block text-[10px]">
                    {model.dimensionsCm.w} × {model.dimensionsCm.d} × {model.dimensionsCm.h} cm
                  </span>
                </td>
                <td className="py-1.5 pr-3" translate="no">
                  {fabric.code}
                </td>
                <td className="py-1.5 text-right">{e.kind === "metre" ? formatMetres(e.metres) : <span className="text-[10px]">— {e.reason}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="mt-5 flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.fabric.code} className="grid grid-cols-[42mm_1fr] gap-4 border border-black p-3" style={{ breakInside: "avoid" }}>
            <div className="flex h-[42mm] items-center justify-center border-2 border-dashed border-black text-center text-[9px] leading-snug">
              NUMUNE
              <br />
              BURAYA
              <br />
              ZIMBALANIR
            </div>
            <div className="flex flex-col gap-2 text-[11px]">
              <p className="font-display text-[22px] leading-none" translate="no">
                {g.fabric.code}
              </p>
              <p className="text-[10px]">
                {g.fabric.series} · {g.fabric.colorName} · {fabricLine(g.fabric)}
              </p>
              <p>
                Toplam ({g.pieces} parça): <strong className="text-[14px]">{g.total !== null ? formatMetres(g.total) : "usta hesaplar"}</strong>
                {g.reasons.length > 0 && <span className="block text-[9.5px]">{g.reasons.join(" · ")}</span>}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <p className="flex items-end gap-2">
                  Lot <span className="inline-block h-[6mm] flex-1 border-b border-black" />
                </p>
                <p className="flex items-end gap-2">
                  Kesilen gerçek metre <span className="inline-block h-[6mm] flex-1 border-b border-black" />
                </p>
              </div>
              <p className="mt-1 flex items-end gap-2">
                Bu rengi ve kumaşı onaylıyorum. İmza / tarih <span className="inline-block h-[7mm] flex-1 border-b border-black" />
              </p>
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-auto flex items-end justify-between gap-6 border-t-2 border-black pt-3">
        <div className="flex items-center gap-4">
          <div className="h-[24mm] w-[24mm]" data-href={feedbackUrl} data-testid="gercek-metre-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="text-[11px] leading-snug">
            <p className="text-[13px]">Kesimden sonra okutun</p>
            <p>Gerçekte kaç metre gittiğini yazın. Sonraki föyler daha doğru olur.</p>
          </div>
        </div>
        <p className="max-w-[70mm] text-right text-[9.5px] leading-snug">
          Sipariş aynı lottan istenmeli. Metraj firmanın kendi verisidir; ORMEN hesaplamaz. Renk onayı zımbalı numune üzerinden verilir.
        </p>
      </footer>
    </article>
  );
}

/** Mounts the sheet for printing, prints once images are in, then calls onDone. */
export function PrintSheet({ data, onDone }: { data: PrintData; onDone: () => void }) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const root = document.getElementById("foy-root");
    const imgs = [...(root?.querySelectorAll("img") ?? [])];
    Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => ((i.onload = r), (i.onerror = r))))))
      .then(() => new Promise((r) => setTimeout(r, 150))) // let the QR land
      .then(() => window.print());
    return () => window.removeEventListener("afterprint", after);
  }, [onDone]);

  return createPortal(
    <div id="foy-root">
      <Sheet data={data} />
      <CutterSheet data={data} />
    </div>,
    document.body,
  );
}
