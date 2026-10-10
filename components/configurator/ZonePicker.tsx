"use client";

import type { Fabric } from "@/lib/types";
import type { Placement } from "@/lib/room/layout";
import { ZONES, ZONE_LABELS, zoneCode, type Zone } from "@/lib/three/zones";
import { DEFAULT_LEG, LEG_COLORS, LEG_FINISHES, LEG_LABELS, type LegFinish } from "@/lib/three/legs";

/**
 * Which part of the piece the next fabric goes on: the whole piece, or only
 * the body, the arms, the cushions or the piping. Each choice shows the
 * fabric that part wears now.
 */
export function ZonePicker({
  piece,
  fabrics,
  zone,
  onZone,
  legs = false,
  onLegs,
}: {
  piece: Placement;
  fabrics: Map<string, Fabric>;
  zone: Zone | null;
  onZone: (z: Zone | null) => void;
  /** The model has wooden legs whose finish can be chosen. */
  legs?: boolean;
  onLegs?: (f: LegFinish) => void;
}) {
  const options: [Zone | null, string][] = [[null, "Tümü"], ...ZONES.map((z) => [z, ZONE_LABELS[z]] as [Zone, string])];
  const mixed = !!piece.zones && Object.keys(piece.zones).length > 0;
  return (
    <div className="mb-5">
      <p className="mb-2 text-[13px] text-antrasit-70">Kumaşın gideceği yer</p>
      <div role="radiogroup" aria-label="Kumaşın gideceği yer" className="flex flex-wrap gap-1.5">
        {options.map(([z, label]) => {
          const f = fabrics.get(zoneCode(piece, z));
          const on = zone === z;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onZone(z)}
              className={`flex h-9 items-center gap-1.5 rounded-full border pl-1 pr-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
                on ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white text-antrasit hover:border-cizgi-koyu"
              }`}
            >
              {f ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny swatch from our own storage
                <img src={f.texture.thumbUrl} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-cizgi" />
              )}
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] leading-snug text-antrasit-50">
        {zone ? `Aşağıdan seçtiğiniz kumaş yalnızca ${ZONE_LABELS[zone].toLocaleLowerCase("tr-TR")} bölümüne gider.` : mixed ? "Tümü seçiliyken seçtiğiniz kumaş koltuğun her yerine gider; bölgelere verdiğiniz kumaşlar kalkar." : "Kolları, gövdeyi ya da minderleri ayrı kumaşla denemek için yukarıdan bir bölge seçin."}
      </p>
      {legs && onLegs && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[13px] text-antrasit-70">Ayak</span>
          <div role="radiogroup" aria-label="Ayak rengi" className="flex gap-1.5">
            {LEG_FINISHES.map((f) => {
              const on = (piece.ayak ?? DEFAULT_LEG) === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Ayak: ${LEG_LABELS[f]}`}
                  title={LEG_LABELS[f]}
                  onClick={() => onLegs(f)}
                  className={`h-8 w-8 rounded-full border-2 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${on ? "border-antrasit shadow-[0_0_0_2px_#fff_inset]" : "border-cizgi"}`}
                  style={{ background: LEG_COLORS[f] }}
                />
              );
            })}
          </div>
          <span className="text-[12px] text-antrasit-50">{LEG_LABELS[piece.ayak ?? DEFAULT_LEG]}</span>
        </div>
      )}
    </div>
  );
}
