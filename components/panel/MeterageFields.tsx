"use client";

import { parseNumber } from "@/lib/panel/fabric-form";
import { METERAGE_ZONES, validateMeterage, type MeterageZone, type ModelMeterage } from "@/lib/metraj";
import { ZONE_LABELS } from "@/lib/three/zones";

// The firm's own fabric metres for one piece of this model, as its
// upholsterer knows them. Repeated on the cutter's sheet only for a plain,
// two-way ORMEN fabric of the same width; never calculated by us. The split
// by zone (meeting of 10 Oct) lets the sheet give metres for a piece in more
// than one fabric too.

export interface MeterageDraft {
  metres: string;
  refWidthCm: string;
  zones: Record<MeterageZone, string>;
}

const emptyZones = () => Object.fromEntries(METERAGE_ZONES.map((z) => [z, ""])) as Record<MeterageZone, string>;

export const meterageDraft = (m?: ModelMeterage | null): MeterageDraft => ({
  metres: m?.metres.toString() ?? "",
  refWidthCm: m?.refWidthCm.toString() ?? "140",
  zones: { ...emptyZones(), ...Object.fromEntries(Object.entries(m?.zones ?? {}).map(([z, v]) => [z, v.toString()])) },
});

/** Draft → value for the save action: null when no metres were entered. */
export function meterageValue(d: MeterageDraft): ModelMeterage | null {
  const metres = parseNumber(d.metres);
  if (metres === undefined) return null;
  const zones: ModelMeterage["zones"] = {};
  for (const z of METERAGE_ZONES) {
    const v = d.zones[z].trim() ? (parseNumber(d.zones[z]) ?? NaN) : undefined;
    if (v !== undefined) zones[z] = v;
  }
  return { metres, refWidthCm: parseNumber(d.refWidthCm) ?? 0, ...(Object.keys(zones).length ? { zones } : {}) };
}

const field = "h-11 w-full rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none";

export function MeterageFields({ value, onChange }: { value: MeterageDraft; onChange: (v: MeterageDraft) => void }) {
  const error = validateMeterage(meterageValue(value));
  const noTotal = !value.metres.trim() && METERAGE_ZONES.some((z) => value.zones[z].trim());
  return (
    <fieldset className="mt-5">
      <legend className="mb-1.5 text-[13px] text-antrasit-70">Metraj (usta föyü için, isteğe bağlı)</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Bir adet için kumaş (m)
          <input inputMode="decimal" value={value.metres} onChange={(e) => onChange({ ...value, metres: e.target.value })} placeholder="ör. 8" className={field} aria-invalid={!!error || noTotal} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Hangi kumaş eninde (cm)
          <input inputMode="decimal" value={value.refWidthCm} onChange={(e) => onChange({ ...value, refWidthCm: e.target.value })} className={field} />
        </label>
      </div>
      <p className={`mt-1.5 text-[12px] ${error || noTotal ? "text-[#9a3b31]" : "text-antrasit-50"}`}>
        {error ??
          (noTotal
            ? "Bölge metrajı için önce bir adetin toplam metrajını yazın."
            : "Firmanın ustasının bu model için kullandığı metraj, düz kumaşta. Föyde yalnızca aynı enli, düz ve çift yönlü ORMEN kumaşlarında gösterilir; diğerlerinde “usta teyit eder” yazar. Bilmiyorsanız boş bırakın.")}
      </p>
      <details className="mt-3" open={METERAGE_ZONES.some((z) => value.zones[z].trim())}>
        <summary className="cursor-pointer text-[12.5px] text-antrasit-70">Bölge başına metraj (aynı en)</summary>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METERAGE_ZONES.map((z) => (
            <label key={z} className="flex flex-col gap-1 text-[12px] text-antrasit-70">
              {ZONE_LABELS[z]} (m)
              <input
                inputMode="decimal"
                aria-label={`${ZONE_LABELS[z]} metrajı`}
                value={value.zones[z]}
                onChange={(e) => onChange({ ...value, zones: { ...value.zones, [z]: e.target.value } })}
                className={field}
              />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-antrasit-50">
          Müşteri kola, minderlere ayrı kumaş seçtiğinde föy bu sayıları toplar. Modelde olmayan bölgeyi boş bırakın; biyeyi usta hesaplar.
        </p>
      </details>
    </fieldset>
  );
}
