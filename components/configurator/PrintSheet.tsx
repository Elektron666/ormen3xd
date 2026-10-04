"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import type { Firm, FurnitureModel } from "@/lib/types";
import type { RoomSpec } from "@/lib/room/spec";
import { FABRIC_TYPE_LABELS } from "@/lib/i18n/tr";
import { PlanSvg, type PlanSvgPiece } from "./PlanSvg";
import { BrandMark } from "./BrandMark";

// "Teklif föyü": a one-page A4 the furniture shop hands to the customer.
// Rendered off-screen and shown only when printing; the browser's
// "Save as PDF" turns it into a PDF with correct Turkish typography.

export interface PrintData {
  snapshot: string;
  url: string;
  room: RoomSpec;
  pieces: (PlanSvgPiece & { model: FurnitureModel })[];
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
            {data.pieces.map(({ p, model, fabric }) => (
              <tr key={p.id} className="border-b border-cizgi align-top">
                <td className="py-2 pr-3">
                  <p className="text-[12px] text-antrasit">{model.name}</p>
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
          <p>Ekran ve baskı renkleri gerçek kumaştan farklı olabilir. Karar öncesi numune isteyin.</p>
        </div>
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
    </div>,
    document.body,
  );
}
