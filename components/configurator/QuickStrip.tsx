"use client";

import { useEffect, useRef } from "react";
import type { Fabric } from "@/lib/types";

// Phone only: the fabrics as one swipeable row right under the fabric name, so
// changing the fabric (the whole point) is on the first screen. The full
// picker with search and filters is one swipe up, as before.

export function QuickStrip({
  fabrics,
  selectedCode,
  onSelect,
}: {
  fabrics: Fabric[];
  selectedCode: string;
  onSelect: (f: Fabric) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // keep the chosen fabric in view (e.g. after picking it in the full list)
    row.current
      ?.querySelector<HTMLElement>(`[data-code="${CSS.escape(selectedCode)}"]`)
      ?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
  }, [selectedCode]);
  return (
    // hidden while the sheet is pulled up: the full picker is on screen then
    <div
      ref={row}
      // the strip sits in the sheet's drag handle: its taps and swipes are its own
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className="-mx-5 mt-3 flex touch-pan-x gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] group-data-[expanded=true]/sheet:hidden"
      data-testid="hizli-kumaslar"
    >
      {fabrics.map((f) => {
        const on = f.code === selectedCode;
        return (
          <button
            key={f.code}
            type="button"
            data-code={f.code}
            aria-pressed={on}
            aria-label={`${f.code} ${f.colorName} kumaşını giydir`}
            onClick={() => onSelect(f)}
            className={`h-12 w-12 shrink-0 rounded-full p-0.5 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${
              on
                ? "shadow-[0_0_0_2px_var(--color-antrasit)]"
                : "shadow-[0_0_0_1px_var(--color-cizgi)]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.texture.thumbUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
}
