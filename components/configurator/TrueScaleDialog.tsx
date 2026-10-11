"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { Fabric } from "@/lib/types";
import { CARD_MM, DEFAULT_PX_PER_CM, pxPerCmFromCard, readStoredScale, storeScale } from "@/lib/screen-scale";

// "Gerçek boyutta gör" (acil toplantı, 11 Oct): the fabric flat on the screen
// at 1:1, so the visitor sees how big the pattern really is. Set once with a
// bank card held against the screen.

const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString("tr-TR");

export function TrueScaleDialog({ open, onClose, fabric }: { open: boolean; onClose: () => void; fabric: Fabric }) {
  const [pxPerCm, setPxPerCm] = useState(DEFAULT_PX_PER_CM);
  const [calibrating, setCalibrating] = useState(false);
  const [areaPx, setAreaPx] = useState(320);

  useEffect(() => {
    if (!open) return;
    const stored = readStoredScale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's stored setting is read when the dialog opens
    setPxPerCm(stored ?? DEFAULT_PX_PER_CM);
    setCalibrating(stored === null);
    setAreaPx(Math.min(window.innerWidth - 64, 560));
  }, [open]);

  const { w, h } = fabric.texture.repeatCm;
  const sideCm = areaPx / pxPerCm;
  const cardW = (CARD_MM.w / 10) * pxPerCm;

  return (
    <Dialog open={open} onClose={onClose} title="Gerçek boyutta" wide>
      {calibrating ? (
        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-relaxed text-antrasit-70">
            Ekranınızın boyunu bir kez ayarlayalım. Herhangi bir banka kartını ekrana yatay tutun ve çerçeveyi kartla aynı boya getirin.
          </p>
          <div className="flex justify-center py-2">
            <div
              data-testid="kart-cercevesi"
              className="rounded-[3.2%/5%] border-2 border-antrasit bg-cizgi/40"
              style={{ width: cardW, height: (cardW * CARD_MM.h) / CARD_MM.w }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Küçült" onClick={() => setPxPerCm((v) => Math.max(15, v - 0.25))} className="h-11 w-11 rounded-full border border-cizgi text-[18px]">
              −
            </button>
            <input
              type="range"
              min={15}
              max={90}
              step={0.05}
              value={pxPerCm}
              onChange={(e) => setPxPerCm(Number(e.target.value))}
              aria-label="Çerçevenin boyu"
              className="flex-1 accent-[#2a2a28]"
            />
            <button type="button" aria-label="Büyüt" onClick={() => setPxPerCm((v) => Math.min(90, v + 0.25))} className="h-11 w-11 rounded-full border border-cizgi text-[18px]">
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              storeScale(pxPerCmFromCard(cardW));
              setCalibrating(false);
            }}
            className="h-11 rounded-full bg-antrasit px-5 text-[14px] text-kagit"
          >
            Kartla aynı boyda, kaydet
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            data-testid="gercek-boyut"
            role="img"
            aria-label={`${fabric.code}, gerçek boyutta`}
            className="mx-auto rounded-lg border border-cizgi"
            style={{
              width: areaPx,
              height: areaPx,
              backgroundImage: `url("${fabric.texture.maps.albedo["1k"]}")`,
              backgroundSize: `${w * pxPerCm}px ${h * pxPerCm}px`,
              backgroundRepeat: "repeat",
            }}
          />
          {/* a 5 cm bar under the fabric, so the size can be checked with a ruler too */}
          <div className="mx-auto flex flex-col items-start" style={{ width: areaPx }}>
            <div className="h-1.5 bg-antrasit" style={{ width: 5 * pxPerCm }} />
            <span className="mt-1 text-[12px] text-antrasit-50">5 cm</span>
          </div>
          <p className="text-[13px] leading-relaxed text-antrasit-70">
            Bu kare {fmt(sideCm)} × {fmt(sideCm)} cm. {fabric.code} kumaşı ekranda gerçek boyutunda.
            {fabric.isPlaceholder && " Örnek kumaştır, satışta değil."} Renk ekrana göre değişir; kesin renk için numune isteyin.
          </p>
          <button type="button" onClick={() => setCalibrating(true)} className="self-start rounded-full px-2 py-1 text-[13px] text-antrasit-70 underline underline-offset-4 hover:text-antrasit">
            Ekran boyunu yeniden ayarla
          </button>
        </div>
      )}
    </Dialog>
  );
}
