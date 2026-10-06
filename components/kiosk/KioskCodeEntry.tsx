"use client";

import { useState } from "react";
import type { Fabric } from "@/lib/types";
import { matchCode } from "@/lib/fabric/code-match";

// Showroom kiosk (5 Oct meeting, D3): the customer holds the swatch card, the
// salesperson types its code here and the fabric goes onto the sofa. A full
// code applies at once when nothing longer starts with it; otherwise the
// matches are offered as large buttons.

export function KioskCodeEntry({ fabrics, selectedCode, onSelect }: { fabrics: Fabric[]; selectedCode: string; onSelect: (f: Fabric) => void }) {
  const [text, setText] = useState("");
  const { exact, list } = matchCode(fabrics, text);

  const apply = (f: Fabric) => {
    onSelect(f);
    setText(f.code);
  };
  const change = (v: string) => {
    setText(v);
    const m = matchCode(fabrics, v);
    if (m.exact && m.list.length === 1 && m.exact.code !== selectedCode) onSelect(m.exact);
  };

  return (
    <div className="mb-5 rounded-2xl border border-cizgi bg-white p-4" data-testid="kiosk-kod">
      <label htmlFor="kiosk-kod-girisi" className="block text-[17px] font-medium text-antrasit">
        Elinizdeki kartelanın kodu
      </label>
      <input
        id="kiosk-kod-girisi"
        value={text}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (exact ?? list[0])) apply((exact ?? list[0])!);
        }}
        placeholder="ör. SIENA-04"
        autoComplete="off"
        // no CSS uppercase: in Turkish "sie" would show as "SİE", while codes are written "SIENA"
        spellCheck={false}
        className="mt-2 h-16 w-full rounded-xl border-2 border-cizgi-koyu bg-kirik-beyaz px-4 font-sans text-[28px] tracking-wide text-antrasit placeholder:text-antrasit-50 focus:border-antrasit focus:outline-none"
      />
      {text.trim() && (
        <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
          {list.length === 0 ? (
            <p className="text-[16px] text-antrasit-70">Bu kodla kumaş bulunamadı ya da bu modelde sunulmuyor.</p>
          ) : (
            list.map((f) => {
              const on = f.code === selectedCode;
              return (
                <button
                  key={f.code}
                  type="button"
                  onClick={() => apply(f)}
                  aria-pressed={on}
                  className={`flex h-12 items-center gap-2.5 rounded-full border-2 py-1 pl-1 pr-4 text-[16px] tracking-wide ${on ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white text-antrasit"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.texture.thumbUrl} alt="" className="h-9 w-9 rounded-full" />
                  <span translate="no">{f.code}</span>
                  {on && <span aria-hidden="true">✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
