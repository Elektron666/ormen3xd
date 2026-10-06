"use client";

import type { Fabric } from "@/lib/types";
import { presetHref, type FirmPreset } from "@/lib/firm-presets";
import { decodeShare } from "@/lib/share";
import { decodeLayout } from "@/lib/room/layout";

// The firm's ready-made scenes as large cards (1st meeting, Deniz): the
// salesperson starts from a good-looking scene instead of an empty tool.
// A card shows the scene's fabrics and opens it on the same page.

export function PresetStrip({ presets, fabrics }: { presets: FirmPreset[]; fabrics: Map<string, Fabric> }) {
  if (!presets.length) return null;
  const open = (id: string) => window.location.assign(presetHref(window.location.pathname, id, new URLSearchParams(window.location.search)));
  return (
    <section aria-labelledby="hazir-sahneler" className="mb-6">
      <h2 id="hazir-sahneler" className="eyebrow mb-2.5">
        Hazır sahneler
      </h2>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:thin] md:-mx-7 md:px-7">
        {presets.map((p) => {
          const layout = decodeLayout(decodeShare(p.id)?.y) ?? [];
          const shown = [...new Set(layout.map((x) => x.fabricCode))].map((c) => fabrics.get(c)).filter((f): f is Fabric => !!f);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p.id)}
              className="w-40 shrink-0 overflow-hidden rounded-2xl border border-cizgi bg-white text-left transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
            >
              <span className="studio-backdrop flex h-24 items-center justify-center" aria-hidden="true">
                {shown.slice(0, 3).map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.code} src={f.texture.thumbUrl} alt="" className={`h-16 w-16 rounded-full border-2 border-white shadow-sm ${i ? "-ml-5" : ""}`} />
                ))}
              </span>
              <span className="block px-3 pt-2 text-[14px] leading-tight text-antrasit">{p.name}</span>
              <span className="block px-3 pb-2 text-[12px] text-antrasit-50">
                {layout.length} parça · {shown.map((f) => f.code).join(", ")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
