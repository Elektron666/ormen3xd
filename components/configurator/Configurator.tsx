"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { prefetchFabric, preferredTextureSize } from "@/lib/three/fabric-material";
import { t } from "@/lib/i18n/tr";
import { CopyCodeButton, FabricHeadline, FabricSpecs } from "./FabricInfo";
import { FabricPicker } from "./FabricPicker";
import { BrandMark } from "./BrandMark";

const Stage = dynamic(() => import("@/components/three/Stage").then((m) => m.Stage), {
  ssr: false,
  loading: () => null,
});

export interface ConfiguratorProps {
  models: FurnitureModel[];
  initialModelSlug: string;
  fabrics: Fabric[];
  initialFabricCode?: string;
  firm?: Firm | null;
}

function setQuery(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.history.replaceState(window.history.state, "", url);
}

export function Configurator({ models, initialModelSlug, fabrics, initialFabricCode, firm }: ConfiguratorProps) {
  const [modelSlug, setModelSlug] = useState(initialModelSlug);
  const model = models.find((m) => m.slug === modelSlug) ?? models[0];
  const byCode = useMemo(() => new Map(fabrics.map((f) => [f.code, f])), [fabrics]);
  const firstFabric = byCode.get(initialFabricCode ?? "") ?? byCode.get(model.defaultFabricCode ?? "") ?? fabrics[0];

  const [selected, setSelected] = useState<Fabric>(firstFabric);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const loading = shownCode !== selected.code;

  const select = useCallback((f: Fabric) => {
    setSelected(f);
    setQuery({ k: f.code });
  }, []);

  const intent = useCallback((f: Fabric) => prefetchFabric(f, preferredTextureSize()), []);

  const onFabricShown = useCallback((code: string, first: boolean) => {
    setShownCode(code);
    if (first) setReady(true);
  }, []);

  const switchModel = (slug: string) => {
    if (slug === modelSlug) return;
    setReady(false);
    setShownCode(null);
    setModelSlug(slug);
    setQuery({ m: slug });
  };

  const style = firm ? ({ "--accent": firm.accentColor } as React.CSSProperties) : undefined;

  return (
    <div style={style} className="relative h-dvh w-full overflow-hidden bg-kirik-beyaz md:grid md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* ---------------------------------------------------------------- scene */}
      <section className="studio-backdrop relative h-[60dvh] md:h-dvh" aria-label="3B sahne">
        <div className="absolute inset-0">
          <Stage
            model={model}
            fabric={selected}
            onFabricShown={onFabricShown}
            onError={() => setFailed(true)}
          />
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-7">
          <div className="pointer-events-auto">
            <BrandMark firm={firm} />
          </div>
          {models.length > 1 && (
            <nav aria-label="Model" className="pointer-events-auto flex rounded-full border border-cizgi bg-kagit/80 p-0.5 backdrop-blur-[2px]">
              {models.map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => switchModel(m.slug)}
                  aria-pressed={m.slug === modelSlug}
                  className={`h-9 rounded-full px-3.5 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-antrasit ${
                    m.slug === modelSlug ? "bg-antrasit text-kagit" : "text-antrasit-70 hover:text-antrasit"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </nav>
          )}
        </header>

        {/* first paint: a quiet placeholder, never a grey sofa */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
          aria-hidden={ready}
        >
          {failed ? (
            <p className="max-w-xs text-center text-sm text-antrasit-70">Sahne yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.</p>
          ) : (
            <>
              <span className="relative block h-px w-24 overflow-hidden bg-cizgi">
                <span className="absolute inset-y-0 left-0 w-1/3 animate-[loadbar_1.2s_ease-in-out_infinite] bg-antrasit-50" />
              </span>
              <span className="eyebrow">{t.loadingFabric}</span>
            </>
          )}
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(2dvh+0.75rem)] px-6 text-center text-[11px] leading-snug text-antrasit-50 md:bottom-4">
          {t.colorDisclaimer}
        </p>
      </section>

      {/* ---------------------------------------------------------------- panel */}
      <FabricSheet
        header={
          <div className="flex items-start justify-between gap-3">
            <FabricHeadline fabric={selected} loading={loading && ready} />
            <CopyCodeButton code={selected.code} className="-mr-2 mt-3 shrink-0" />
          </div>
        }
      >
        <div className="mb-6">
          <FabricSpecs fabric={selected} />
          {selected.description && <p className="mt-3 text-sm leading-relaxed text-antrasit-70">{selected.description}</p>}
        </div>
        <FabricPicker fabrics={fabrics} selectedCode={selected.code} onSelect={select} onIntent={intent} />
        <p className="mt-10 border-t border-cizgi pt-4 text-center text-[11px] tracking-[0.12em] text-antrasit-50 uppercase">
          {firm ? t.signature : "ORMEN TEKSTİL · Ankara"}
        </p>
      </FabricSheet>
    </div>
  );
}

/**
 * Phone: a bottom sheet that can be pulled up (two stops).
 * Tablet / desktop (md+): a fixed side panel.
 */
function FabricSheet({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; moved: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [expanded]);

  const onDown = (e: RPointerEvent) => {
    start.current = { y: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > 4) start.current.moved = true;
    setDrag(dy);
  };
  const onUp = () => {
    if (!start.current) return;
    const { moved } = start.current;
    if (!moved) setExpanded((v) => !v);
    else if (drag < -40) setExpanded(true);
    else if (drag > 40) setExpanded(false);
    start.current = null;
    setDrag(0);
  };

  const base = expanded ? 86 : 42; // dvh
  const height = `calc(${base}dvh - ${drag}px)`;

  return (
    <aside
      aria-label={t.fabrics}
      style={{ "--sheet-h": height } as React.CSSProperties}
      className={`fixed inset-x-0 bottom-0 z-10 flex h-[var(--sheet-h)] max-h-[92dvh] min-h-[30dvh] flex-col rounded-t-[22px] border-t border-cizgi bg-kagit shadow-[0_-12px_40px_-12px_rgba(42,42,40,0.18)] ${
        drag === 0 ? "transition-[height] duration-300 ease-out-soft" : ""
      } md:static md:z-auto md:h-dvh md:max-h-none md:min-h-0 md:rounded-none md:border-l md:border-t-0 md:shadow-none`}
    >
      <div
        className="flex shrink-0 touch-none flex-col px-5 pt-2 md:px-7 md:pt-7"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          aria-expanded={expanded}
          aria-label={expanded ? t.hideFabrics : t.showFabrics}
          className="mx-auto mb-2 flex h-6 w-16 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-antrasit md:hidden"
        >
          <span className="block h-1 w-10 rounded-full bg-cizgi-koyu" />
        </button>
        {header}
      </div>
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 md:px-7">
        {children}
      </div>
    </aside>
  );
}
