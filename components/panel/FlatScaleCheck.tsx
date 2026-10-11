"use client";

import { useEffect, useState } from "react";

// Ar-Ge, first step (ARGE.md): the fabric flat, at real size, to hold against
// the real fabric. The window is centred on a corner where four tiles meet,
// so the seams cross in the middle whatever the repeat's size.
// A screen does not report its own size, so 10 cm is set once against a ruler
// and remembered in this browser.

const KEY = "ormen_cm_px";
const DEFAULT_PX_PER_CM = 96 / 2.54; // CSS reference pixel; most screens are close, few are exact

function stored(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v > 10 && v < 200 ? v : DEFAULT_PX_PER_CM;
  } catch {
    return DEFAULT_PX_PER_CM;
  }
}

export function FlatScaleCheck({ textureUrl, repeatCm }: { textureUrl: string; repeatCm: { w: number; h: number } }) {
  const [pxPerCm, setPxPerCm] = useState(DEFAULT_PX_PER_CM);
  const [calibrating, setCalibrating] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser's stored calibration is read after mount
  useEffect(() => setPxPerCm(stored()), []);
  const save = (v: number) => {
    setPxPerCm(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* private mode: the setting lasts for this page only */
    }
  };

  const tileW = repeatCm.w * pxPerCm;
  const tileH = repeatCm.h * pxPerCm;
  // up to 2 × 2 tiles; a big repeat is shown as a window onto it
  const w = Math.min(2 * tileW, 560);
  const h = Math.min(2 * tileH, 420);
  // a tile corner at the window's centre
  const pos = `${w / 2}px ${h / 2}px`;
  const ten = 10 * pxPerCm;

  return (
    <section className="mt-4 rounded-2xl border border-cizgi bg-kagit p-4" aria-label="Düz ölçek ve dikiş kontrolü">
      <h3 className="text-[14px] font-medium">Düz ölçek ve dikiş kontrolü</h3>
      <p className="mt-1 text-[12.5px] leading-snug text-antrasit-70">
        Kumaş gerçek boyutunda. Gerçek kumaşı ekranın yanına koyun: desen aynı boyda görünmeli. Ortada dört tekrarın birleştiği köşe var (ince kırmızı çizgiler); çizgi
        boyunca desen kayıyor ya da belirgin bir iz varsa fotoğraf yeniden hazırlanmalı. Rapor: {repeatCm.w} × {repeatCm.h} cm.
      </p>
      <div className="mt-3 overflow-auto">
        <div
          data-testid="duz-olcek"
          className="relative rounded-md border border-cizgi"
          style={{ width: w, height: h, backgroundImage: `url("${textureUrl}")`, backgroundSize: `${tileW}px ${tileH}px`, backgroundPosition: pos, backgroundRepeat: "repeat" }}
        >
          {/* where one tile meets the next */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, rgba(180,72,60,.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(180,72,60,.55) 1px, transparent 1px)`, backgroundSize: `${tileW}px ${tileH}px`, backgroundPosition: pos }} />
        </div>
      </div>
      <div className="mt-3">
        <svg width={ten + 2} height="26" aria-label="Ekranda 10 cm" role="img">
          <rect x="1" y="1" width={ten} height="10" fill="#2A2A28" />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={i} x1={1 + i * pxPerCm} x2={1 + i * pxPerCm} y1="11" y2={i % 5 === 0 ? 24 : 18} stroke="#2A2A28" strokeWidth="1" />
          ))}
        </svg>
        <p className="text-[12px] text-antrasit-70">
          Bu çizgi ekranda 10 cm olmalı.{" "}
          <button type="button" onClick={() => setCalibrating((c) => !c)} className="underline underline-offset-2">
            {calibrating ? "Tamam" : "Cetvelle ayarla"}
          </button>
        </p>
        {calibrating && (
          <label className="mt-2 flex items-center gap-3 text-[12px] text-antrasit-70">
            Kısa
            <input type="range" min={20} max={80} step={0.1} value={pxPerCm} onChange={(e) => save(Number(e.target.value))} className="flex-1" aria-label="Ekrandaki 10 cm" />
            Uzun
          </label>
        )}
      </div>
    </section>
  );
}
