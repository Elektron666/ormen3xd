"use client";

import { parseNumber } from "@/lib/panel/fabric-form";
import { validateMeterage, type ModelMeterage } from "@/lib/metraj";

// The firm's own fabric metres for one piece of this model, as its
// upholsterer knows them. Repeated on the cutter's sheet only for a plain,
// two-way ORMEN fabric of the same width; never calculated by us.

export interface MeterageDraft {
  metres: string;
  refWidthCm: string;
}

export const meterageDraft = (m?: ModelMeterage | null): MeterageDraft => ({ metres: m?.metres.toString() ?? "", refWidthCm: m?.refWidthCm.toString() ?? "140" });

/** Draft → value for the save action: null when no metres were entered. */
export function meterageValue(d: MeterageDraft): ModelMeterage | null {
  const metres = parseNumber(d.metres);
  if (metres === undefined) return null;
  return { metres, refWidthCm: parseNumber(d.refWidthCm) ?? 0 };
}

const field = "h-11 w-full rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none";

export function MeterageFields({ value, onChange }: { value: MeterageDraft; onChange: (v: MeterageDraft) => void }) {
  const error = validateMeterage(meterageValue(value));
  return (
    <fieldset className="mt-5">
      <legend className="mb-1.5 text-[13px] text-antrasit-70">Metraj (usta föyü için, isteğe bağlı)</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Bir adet için kumaş (m)
          <input inputMode="decimal" value={value.metres} onChange={(e) => onChange({ ...value, metres: e.target.value })} placeholder="ör. 8" className={field} aria-invalid={!!error} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Hangi kumaş eninde (cm)
          <input inputMode="decimal" value={value.refWidthCm} onChange={(e) => onChange({ ...value, refWidthCm: e.target.value })} className={field} />
        </label>
      </div>
      <p className={`mt-1.5 text-[12px] ${error ? "text-[#9a3b31]" : "text-antrasit-50"}`}>
        {error ??
          "Firmanın ustasının bu model için kullandığı metraj, düz kumaşta. Föyde yalnızca aynı enli, düz ve çift yönlü ORMEN kumaşlarında gösterilir; diğerlerinde “usta teyit eder” yazar. Bilmiyorsanız boş bırakın."}
      </p>
    </fieldset>
  );
}
