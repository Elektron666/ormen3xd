"use client";

import { useEffect, useState, type ReactNode } from "react";

// The firm's own photo of the piece, next to or over the live preview, so the
// choices can be matched by eye ("Seçerek oluştur" from a photo). The photo
// stays in this browser tab: it is never uploaded or saved.

export function ReferencePhoto({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"yan" | "ust">("yan");
  const [opacity, setOpacity] = useState(0.45);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUrl(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[46vh] min-h-[340px] lg:h-[62vh]">
        {children}
        {url && mode === "ust" && (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a served image
          <img src={url} alt="" className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-contain" style={{ opacity }} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-cizgi bg-white px-3.5 hover:border-cizgi-koyu focus-within:outline-2 focus-within:outline-antrasit">
          {url ? "Başka fotoğraf" : "Firmanın fotoğrafını koy"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {url && (
          <>
            <div role="radiogroup" aria-label="Fotoğraf yerleşimi" className="flex gap-1">
              {(
                [
                  ["yan", "Altında"],
                  ["ust", "Üstüne bindir"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`h-9 rounded-full border px-3 ${mode === m ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === "ust" && (
              <label className="flex items-center gap-2 text-antrasit-70">
                Saydamlık
                <input type="range" min={0.15} max={0.85} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-28 accent-[#2a2a28]" />
              </label>
            )}
            <button type="button" onClick={() => setUrl(null)} className="h-9 rounded-full px-3 text-antrasit-70 hover:bg-cizgi/60">
              Kaldır
            </button>
          </>
        )}
      </div>
      {url && mode === "yan" && (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a served image
        <img src={url} alt="Firmanın fotoğrafı" className="max-h-[40vh] w-full rounded-2xl border border-cizgi bg-white object-contain" />
      )}
      <p className="text-[12px] leading-snug text-antrasit-50">
        Fotoğraf yalnızca bu ekranda görünür; hiçbir yere yüklenmez ve kaydedilmez. Üstüne bindirince koltuğu fotoğraftaki açıya çevirip oranları karşılaştırın.
      </p>
    </div>
  );
}
