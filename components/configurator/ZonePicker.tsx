"use client";

import type { Fabric } from "@/lib/types";
import type { Placement } from "@/lib/room/layout";
import { ZONES, ZONE_LABELS, zoneCode, type Zone } from "@/lib/three/zones";

/**
 * Which part of the piece the next fabric goes on: the whole piece, or only
 * the body, the arms, the cushions or the piping. Each choice shows the
 * fabric that part wears now.
 */
export function ZonePicker({ piece, fabrics, zone, onZone }: { piece: Placement; fabrics: Map<string, Fabric>; zone: Zone | null; onZone: (z: Zone | null) => void }) {
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
    </div>
  );
}
