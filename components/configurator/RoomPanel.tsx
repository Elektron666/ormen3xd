"use client";

import { useState } from "react";
import {
  FLOORS,
  ROOM_LIMITS,
  ROOM_PRESETS,
  WALL_COLORS,
  clampRoom,
  floorFinish,
  furnitureFits,
  matchingPreset,
  wallColor,
  type RoomPreset,
  type RoomShape,
  type RoomSpec,
} from "@/lib/room/spec";

export interface RoomPanelProps {
  spec: RoomSpec;
  onChange: (spec: RoomSpec, preset?: RoomPreset) => void;
  furnitureCm: { w: number; d: number; h: number };
}

const SHAPES: { id: RoomShape; name: string }[] = [
  { id: "yok", name: "Duvarsız" },
  { id: "dikdortgen", name: "Dikdörtgen" },
  { id: "l", name: "L biçimli" },
  { id: "kose", name: "Köşe" },
];

/** Plan icons drawn for this project (top view, back wall at the top). */
function ShapeIcon({ shape }: { shape: RoomShape }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 40 32" width="40" height="32" aria-hidden="true">
      {shape === "yok" && <rect x="6" y="6" width="28" height="20" rx="2" fill="currentColor" opacity="0.14" />}
      {shape === "dikdortgen" && <rect x="6" y="6" width="28" height="20" {...common} />}
      {shape === "l" && <path d="M6 6 H34 V16 H22 V26 H6 Z" {...common} />}
      {shape === "kose" && <path d="M6 26 V6 H34" {...common} />}
      <rect x="15" y="8" width="10" height="4" rx="1" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function RoomPanel({ spec, onChange, furnitureCm }: RoomPanelProps) {
  const active = matchingPreset(spec);
  const set = (patch: Partial<RoomSpec>) => onChange(clampRoom({ ...spec, ...patch }));
  const fits = furnitureFits(spec, furnitureCm);

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="hazir-sahneler">
        <h3 id="hazir-sahneler" className="eyebrow mb-3">Hazır sahneler</h3>
        <div className="grid grid-cols-3 gap-2">
          {ROOM_PRESETS.map((p) => {
            const selected = active?.id === p.id;
            const wall = wallColor(p.spec.wallId).hex;
            const floor = floorFinish(p.spec.floorId);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...p.spec }, p)}
                className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${
                  selected ? "border-antrasit" : "border-cizgi hover:border-cizgi-koyu"
                }`}
              >
                <span className="relative block aspect-[4/3] w-full" aria-hidden="true">
                  {p.spec.shape === "yok" ? (
                    <span className="studio-backdrop absolute inset-0" />
                  ) : (
                    <>
                      <span className="absolute inset-x-0 top-0 h-[62%]" style={{ background: wall }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={floor.thumb} alt="" className="absolute inset-x-0 bottom-0 h-[38%] w-full object-cover" />
                      <span className="absolute inset-x-0 top-[62%] h-[3px] -translate-y-full bg-[#F2EFEA]" />
                    </>
                  )}
                  <span className="absolute bottom-[30%] left-1/2 h-[16%] w-[46%] -translate-x-1/2 rounded-[3px] bg-antrasit/25" />
                </span>
                <span className={`px-2 py-1.5 text-[12px] leading-tight ${selected ? "text-antrasit" : "text-antrasit-70"}`}>{p.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="oda-sekli">
        <h3 id="oda-sekli" className="eyebrow mb-3">Oda şekli</h3>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="oda-sekli">
          {SHAPES.map((s) => {
            const selected = spec.shape === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set({ shape: s.id })}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[12px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${
                  selected ? "border-antrasit text-antrasit" : "border-cizgi text-antrasit-70 hover:border-cizgi-koyu"
                }`}
              >
                <ShapeIcon shape={s.id} />
                {s.name}
              </button>
            );
          })}
        </div>
      </section>

      {spec.shape !== "yok" && (
        <>
          <section aria-labelledby="olculer">
            <h3 id="olculer" className="eyebrow mb-3">Ölçüler</h3>
            <div className="grid grid-cols-3 gap-2">
              <DimensionInput key={`w${spec.widthCm}`} label="Genişlik" value={spec.widthCm} limits={ROOM_LIMITS.widthCm} onCommit={(v) => set({ widthCm: v })} />
              <DimensionInput key={`d${spec.depthCm}`} label="Derinlik" value={spec.depthCm} limits={ROOM_LIMITS.depthCm} onCommit={(v) => set({ depthCm: v })} />
              <DimensionInput key={`h${spec.heightCm}`} label="Tavan" value={spec.heightCm} limits={ROOM_LIMITS.heightCm} onCommit={(v) => set({ heightCm: v })} />
            </div>
            {!fits && (
              <p role="status" className="mt-2.5 rounded-lg bg-[#F4E9DD] px-3 py-2 text-[13px] leading-snug text-ceviz">
                Koltuk ({furnitureCm.w} × {furnitureCm.d} cm) bu odaya rahat sığmıyor. Genişliği ya da derinliği artırın.
              </p>
            )}
            {spec.shape === "l" && (
              <p className="mt-2 text-[12px] leading-snug text-antrasit-50">L odada girinti ön sağ köşededir; koltuk arka duvara yerleşir.</p>
            )}
          </section>

          <section aria-labelledby="duvar-rengi">
            <h3 id="duvar-rengi" className="eyebrow mb-3">Duvar rengi</h3>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="duvar-rengi">
              {WALL_COLORS.map((w) => {
                const selected = spec.wallId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={w.name}
                    title={w.name}
                    onClick={() => set({ wallId: w.id })}
                    className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-antrasit"
                  >
                    <span
                      className={`block h-8 w-8 rounded-full border border-black/10 transition-shadow duration-200 ${selected ? "shadow-[0_0_0_2px_var(--color-kagit),0_0_0_3.5px_var(--color-antrasit)]" : ""}`}
                      style={{ background: w.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="zemin">
            <h3 id="zemin" className="eyebrow mb-3">Zemin</h3>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-labelledby="zemin">
              {FLOORS.map((f) => {
                const selected = spec.floorId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set({ floorId: f.id })}
                    className="group flex flex-col items-center gap-1.5 rounded-xl py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.thumb}
                      alt=""
                      className={`aspect-square w-full max-w-[64px] rounded-lg object-cover transition-shadow duration-200 ${selected ? "shadow-[0_0_0_2px_var(--color-kagit),0_0_0_3.5px_var(--color-antrasit)]" : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"}`}
                    />
                    <span className={`text-[11px] leading-tight ${selected ? "text-antrasit" : "text-antrasit-70"}`}>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Centimetre input that commits on blur / Enter, so typing "4" on the way to
 * "450" does not rebuild the room. Keyed by value, so it resets when the room
 * changes from elsewhere (e.g. a preset).
 */
function DimensionInput({
  label,
  value,
  limits,
  onCommit,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number };
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const v = Number(draft.replace(",", "."));
    if (Number.isFinite(v) && v > 0) onCommit(v);
    else setDraft(String(value));
  };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] text-antrasit-70">{label}</span>
      <span className="flex h-11 items-center rounded-lg border border-cizgi bg-white/70 pr-2.5 focus-within:border-antrasit-50 focus-within:bg-white">
        <input
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full min-w-0 bg-transparent px-2.5 text-[15px] tabular-nums text-antrasit focus:outline-none"
        />
        <span className="text-[12px] text-antrasit-50">cm</span>
      </span>
      <span className="text-[11px] text-antrasit-50">
        {limits.min}–{limits.max}
      </span>
    </label>
  );
}
