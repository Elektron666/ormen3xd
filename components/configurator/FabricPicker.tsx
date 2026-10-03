"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ColorFamily, Fabric, FabricType } from "@/lib/types";
import { COLOR_FAMILY_LABELS, COLOR_FAMILY_SWATCH, FABRIC_TYPE_LABELS, foldTr, t } from "@/lib/i18n/tr";
import { IconClose, IconSearch } from "@/components/ui/icons";

export interface FabricPickerProps {
  fabrics: Fabric[];
  selectedCode: string;
  onSelect: (fabric: Fabric) => void;
  onIntent?: (fabric: Fabric) => void;
}

export function filterFabrics(
  fabrics: Fabric[],
  q: string,
  type: FabricType | null,
  family: ColorFamily | null,
): Fabric[] {
  const needle = foldTr(q.trim());
  return fabrics.filter((f) => {
    if (type && f.type !== type) return false;
    if (family && f.colorFamily !== family) return false;
    if (!needle) return true;
    const hay = foldTr(`${f.code} ${f.series} ${f.colorName} ${FABRIC_TYPE_LABELS[f.type]}`);
    return needle.split(/\s+/).every((part) => hay.includes(part));
  });
}

function groupBySeries(fabrics: Fabric[]) {
  const groups = new Map<string, Fabric[]>();
  for (const f of fabrics) {
    const g = groups.get(f.series);
    if (g) g.push(f);
    else groups.set(f.series, [f]);
  }
  return [...groups.entries()];
}

export function FabricPicker({ fabrics, selectedCode, onSelect, onIntent }: FabricPickerProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<FabricType | null>(null);
  const [family, setFamily] = useState<ColorFamily | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const types = useMemo(() => [...new Set(fabrics.map((f) => f.type))], [fabrics]);
  const families = useMemo(() => [...new Set(fabrics.map((f) => f.colorFamily))], [fabrics]);
  const filtered = useMemo(() => filterFabrics(fabrics, query, type, family), [fabrics, query, type, family]);
  const groups = useMemo(() => groupBySeries(filtered), [filtered]);

  // Roving tab index: the selected swatch (or the first one) is the single tab stop.
  const tabStop = filtered.some((f) => f.code === selectedCode) ? selectedCode : filtered[0]?.code;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const idx = filtered.findIndex((f) => f.code === (document.activeElement as HTMLElement)?.dataset.code);
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(filtered.length - 1, idx + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, idx - 1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = filtered.length - 1;
    const fabric = filtered[next];
    if (!fabric) return;
    listRef.current?.querySelector<HTMLElement>(`[data-code="${fabric.code}"]`)?.focus();
    onSelect(fabric);
  }

  const hasFilters = Boolean(query || type || family);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">{t.search}</span>
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-antrasit-50" width={18} height={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            enterKeyHint="search"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-cizgi bg-white/70 pl-10 pr-10 text-[15px] text-antrasit placeholder:text-antrasit-50 transition-colors focus:border-antrasit-50 focus:bg-white focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-antrasit-50 hover:text-antrasit"
              aria-label="Aramayı temizle"
            >
              <IconClose width={16} height={16} />
            </button>
          )}
        </label>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-thin" role="group" aria-label="Kumaş tipi">
          <Chip active={type === null} onClick={() => setType(null)}>{t.allTypes}</Chip>
          {types.map((ty) => (
            <Chip key={ty} active={type === ty} onClick={() => setType(type === ty ? null : ty)}>
              {FABRIC_TYPE_LABELS[ty]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t.colorFamily}>
          {families.map((fam) => (
            <button
              key={fam}
              type="button"
              onClick={() => setFamily(family === fam ? null : fam)}
              aria-pressed={family === fam}
              title={COLOR_FAMILY_LABELS[fam]}
              aria-label={COLOR_FAMILY_LABELS[fam]}
              className="group flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-antrasit"
            >
              <span
                className={`block h-5 w-5 rounded-full border border-black/10 transition-transform duration-200 group-hover:scale-110 ${family === fam ? "ring-2 ring-antrasit ring-offset-2 ring-offset-kagit" : ""}`}
                style={{ background: COLOR_FAMILY_SWATCH[fam] }}
              />
            </button>
          ))}
        </div>
      </div>

      <div ref={listRef} role="radiogroup" aria-label={t.fabrics} onKeyDown={onKeyDown} className="flex flex-col gap-6">
        {groups.length === 0 && (
          <div className="py-8 text-center text-sm text-antrasit-70">
            <p>{t.noResults}</p>
            {hasFilters && (
              <button
                type="button"
                className="mt-2 underline underline-offset-4"
                onClick={() => {
                  setQuery("");
                  setType(null);
                  setFamily(null);
                }}
              >
                {t.clearFilters}
              </button>
            )}
          </div>
        )}
        {groups.map(([series, items]) => (
          <section key={series} aria-label={`${series} serisi`}>
            <header className="mb-2.5 flex items-baseline justify-between border-b border-cizgi pb-1.5">
              <h3 className="font-display text-base tracking-[0.08em] text-antrasit" translate="no">{series}</h3>
              <span className="text-xs text-antrasit-50">
                {FABRIC_TYPE_LABELS[items[0].type]} · {items.length} renk
              </span>
            </header>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-x-2 gap-y-3">
              {items.map((f) => {
                const selected = f.code === selectedCode;
                return (
                  <button
                    key={f.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${f.code}, ${f.colorName}`}
                    data-code={f.code}
                    tabIndex={f.code === tabStop ? 0 : -1}
                    onClick={() => onSelect(f)}
                    onPointerEnter={() => onIntent?.(f)}
                    onFocus={() => onIntent?.(f)}
                    className="group flex flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
                  >
                    <span
                      className={`relative block aspect-square w-full max-w-[60px] overflow-hidden rounded-full transition-[box-shadow,transform] duration-200 ease-out-soft group-active:scale-95 ${
                        selected
                          ? "shadow-[0_0_0_2px_var(--color-kagit),0_0_0_3.5px_var(--accent)]"
                          : "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] group-hover:shadow-[0_0_0_2px_var(--color-kagit),0_0_0_3px_var(--color-cizgi-koyu)]"
                      }`}
                      style={{ background: f.texture.avgColor }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.texture.thumbUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" draggable={false} />
                    </span>
                    <span className={`max-w-full truncate text-[11px] leading-tight ${selected ? "text-antrasit" : "text-antrasit-70"}`}>
                      {f.colorName}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-antrasit ${
        active ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi text-antrasit-70 hover:border-cizgi-koyu hover:text-antrasit"
      }`}
    >
      {children}
    </button>
  );
}
