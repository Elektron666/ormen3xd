"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { prefetchFabric, preferredTextureSize } from "@/lib/three/fabric-material";
import { t } from "@/lib/i18n/tr";
import { CopyCodeButton, FabricHeadline, FabricSpecs } from "./FabricInfo";
import { FabricPicker } from "./FabricPicker";
import { BrandMark } from "./BrandMark";
import { RoomPanel } from "./RoomPanel";
import { CompareDivider, SceneTools } from "./SceneTools";
import { useFavorites } from "@/lib/favorites";
import { IconClose, IconHeart } from "@/components/ui/icons";
import { DEFAULT_PRESET, encodeRoom, matchingPreset, type RoomPreset, type RoomSpec } from "@/lib/room/spec";

const Stage = dynamic(() => import("@/components/three/Stage").then((m) => m.Stage), {
  ssr: false,
  loading: () => null,
});

export interface ConfiguratorProps {
  models: FurnitureModel[];
  initialModelSlug: string;
  fabrics: Fabric[];
  initialFabricCode?: string;
  initialRoom?: RoomSpec | null;
  initialPlan?: boolean;
  firm?: Firm | null;
}

type Tab = "kumas" | "oda";
type Slot = "sol" | "sag";
interface CompareState {
  right: Fabric;
  active: Slot;
}

function setQuery(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.history.replaceState(window.history.state, "", url);
}

export function Configurator({ models, initialModelSlug, fabrics, initialFabricCode, initialRoom, initialPlan = false, firm }: ConfiguratorProps) {
  const [modelSlug, setModelSlug] = useState(initialModelSlug);
  const model = models.find((m) => m.slug === modelSlug) ?? models[0];
  const byCode = useMemo(() => new Map(fabrics.map((f) => [f.code, f])), [fabrics]);
  const firstFabric = byCode.get(initialFabricCode ?? "") ?? byCode.get(model.defaultFabricCode ?? "") ?? fabrics[0];

  const [selected, setSelected] = useState<Fabric>(firstFabric);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const loading = shownCode !== selected.code;

  const [tab, setTab] = useState<Tab>("kumas");
  const [room, setRoom] = useState<RoomSpec>(() => initialRoom ?? { ...DEFAULT_PRESET.spec });
  const [ambient, setAmbient] = useState(() => (initialRoom ? matchingPreset(initialRoom) ?? DEFAULT_PRESET : DEFAULT_PRESET).ambient);

  const changeRoom = useCallback((spec: RoomSpec, preset?: RoomPreset) => {
    setRoom(spec);
    if (preset) setAmbient(preset.ambient);
    setQuery({ oda: matchingPreset(spec)?.id ?? encodeRoom(spec) });
  }, []);

  const [closeUp, setCloseUp] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [fading, setFading] = useState(false);

  // 3D ⇄ plan: a short fade hides the camera swap
  const togglePlan = () => {
    setFading(true);
    window.setTimeout(() => {
      const next = !plan;
      setPlan(next);
      setQuery({ g: next ? "plan" : "3b" });
      setCloseUp(false);
      window.setTimeout(() => setFading(false), 60);
    }, 160);
  };
  const [showDims, setShowDims] = useState(false);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [split, setSplit] = useState(0.5);
  const favorites = useFavorites();

  const select = useCallback(
    (f: Fabric) => {
      if (compare?.active === "sag") {
        setCompare({ ...compare, right: f });
        return;
      }
      setSelected(f);
      setQuery({ k: f.code });
    },
    [compare],
  );

  const toggleCompare = () => {
    if (compare) {
      setCompare(null);
      return;
    }
    // start with a fabric from another series so the difference is obvious
    const other = fabrics.find((f) => f.series !== selected.series) ?? fabrics.find((f) => f.code !== selected.code) ?? selected;
    setCompare({ right: other, active: "sag" });
    setSplit(0.5);
    setTab("kumas");
  };

  const shownFabric = compare?.active === "sag" ? compare.right : selected;

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
        <div className={`absolute inset-0 transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>
          <Stage
            model={model}
            fabric={selected}
            room={room}
            ambient={ambient}
            compareFabric={compare?.right ?? null}
            split={split}
            closeUp={closeUp}
            showDimensions={showDims}
            plan={plan}
            onFabricShown={onFabricShown}
            onError={() => setFailed(true)}
          />
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-7">
          <div
            className={`pointer-events-auto rounded-xl transition-colors duration-300 ${room.shape !== "yok" ? "-m-2.5 bg-kagit/85 p-2.5 backdrop-blur-[2px]" : ""}`}
          >
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

        {compare && ready && (
          <CompareDivider split={split} onSplit={setSplit} leftCode={selected.code} rightCode={compare.right.code} />
        )}

        {ready && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(2dvh+2.75rem)] flex justify-center px-4 md:bottom-12">
            <div className="pointer-events-auto">
              <SceneTools
                plan={plan}
                onPlan={togglePlan}
                closeUp={closeUp}
                onCloseUp={() => setCloseUp((v) => !v)}
                dimensions={showDims}
                onDimensions={() => setShowDims((v) => !v)}
                comparing={Boolean(compare)}
                onCompare={toggleCompare}
              />
            </div>
          </div>
        )}

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

        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(2dvh+0.75rem)] flex justify-center px-6 md:bottom-4">
          <span
            className={`rounded-full text-center text-[11px] leading-snug transition-colors duration-300 ${
              room.shape !== "yok" ? "bg-kagit/85 px-3 py-1 text-antrasit-70" : "text-antrasit-50"
            }`}
          >
            {t.colorDisclaimer}
          </span>
        </p>
      </section>

      {/* ---------------------------------------------------------------- panel */}
      <FabricSheet
        header={
          <>
            <div className="flex items-start justify-between gap-3">
              <FabricHeadline fabric={shownFabric} loading={loading && ready && shownFabric === selected} />
              <div className="-mr-2 mt-3 flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => favorites.toggle(shownFabric.code)}
                  aria-pressed={favorites.has(shownFabric.code)}
                  aria-label={favorites.has(shownFabric.code) ? `${shownFabric.code} beğendiklerimden çıkar` : `${shownFabric.code} beğendiklerime ekle`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-cizgi/60 focus-visible:outline-2 focus-visible:outline-antrasit ${
                    favorites.has(shownFabric.code) ? "text-accent" : "text-antrasit-70"
                  }`}
                >
                  <IconHeart width={19} height={19} filled={favorites.has(shownFabric.code)} />
                </button>
                <CopyCodeButton code={shownFabric.code} />
              </div>
            </div>
            <div role="tablist" aria-label="Panel" className="mt-4 grid grid-cols-2 border-b border-cizgi">
              {(
                [
                  ["kumas", "Kumaş"],
                  ["oda", "Oda"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`sekme-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`bolum-${id}`}
                  onClick={() => setTab(id)}
                  className={`-mb-px h-11 border-b-2 text-[14px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-antrasit ${
                    tab === id ? "border-antrasit text-antrasit" : "border-transparent text-antrasit-50 hover:text-antrasit"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        }
      >
        <div id="bolum-kumas" role="tabpanel" aria-labelledby="sekme-kumas" hidden={tab !== "kumas"}>
          {compare && (
            <div className="mb-6 rounded-xl border border-cizgi p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">Karşılaştırma</span>
                <button
                  type="button"
                  onClick={() => setCompare(null)}
                  className="-mr-1 flex h-9 items-center gap-1 rounded-full px-2 text-[12px] text-antrasit-70 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit"
                >
                  <IconClose width={14} height={14} /> Kapat
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kumaş seçilecek taraf">
                {(
                  [
                    ["sol", "Sol", selected],
                    ["sag", "Sağ", compare.right],
                  ] as const
                ).map(([slot, label, f]) => (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={compare.active === slot}
                    onClick={() => setCompare({ ...compare, active: slot })}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
                      compare.active === slot ? "border-antrasit bg-white" : "border-cizgi hover:border-cizgi-koyu"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.texture.thumbUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-antrasit-50">{label}</span>
                      <span className="block truncate font-display text-[15px] text-antrasit" translate="no">{f.code}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-antrasit-50">Seçili tarafa kumaş atamak için aşağıdan bir kumaşa dokunun.</p>
            </div>
          )}
          <div className="mb-6">
            <FabricSpecs fabric={shownFabric} />
            {shownFabric.description && <p className="mt-3 text-sm leading-relaxed text-antrasit-70">{shownFabric.description}</p>}
          </div>
          {favorites.codes.length > 0 && (
            <section aria-labelledby="begendiklerim" className="mb-6">
              <h3 id="begendiklerim" className="eyebrow mb-2.5">
                Beğendiklerim · {favorites.codes.length}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {favorites.codes.map((code) => {
                  const f = byCode.get(code);
                  if (!f) return null;
                  return (
                    <li key={code}>
                      <button
                        type="button"
                        onClick={() => select(f)}
                        title={`${f.code} · ${f.colorName}`}
                        className="flex items-center gap-2 rounded-full border border-cizgi py-1 pl-1 pr-3 text-[12px] text-antrasit hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.texture.thumbUrl} alt="" className="h-7 w-7 rounded-full" />
                        <span translate="no">{f.code}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <FabricPicker fabrics={fabrics} selectedCode={shownFabric.code} onSelect={select} onIntent={intent} />
        </div>
        <div id="bolum-oda" role="tabpanel" aria-labelledby="sekme-oda" hidden={tab !== "oda"}>
          <RoomPanel spec={room} onChange={changeRoom} furnitureCm={model.dimensionsCm} />
        </div>
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
