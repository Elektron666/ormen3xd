"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as RPointerEvent,
} from "react";
import type { FurnitureModel } from "@/lib/types";
import {
  IconArrowsH,
  IconCompare,
  IconCube,
  IconPlan,
  IconRuler,
  IconZoom,
  IconZoomOut,
} from "@/components/ui/icons";

function ToolButton({
  pressed,
  onClick,
  icon,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-full px-4 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${
        pressed ? "bg-antrasit text-kagit" : "text-antrasit hover:bg-cizgi/70"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Open state of a small menu that closes on Escape or a press outside it. */
function useMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: globalThis.KeyboardEvent) =>
      e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return { open, setOpen, root };
}

const menuPanel =
  "absolute bottom-[calc(100%+10px)] min-w-56 overflow-hidden rounded-2xl border border-cizgi bg-kagit p-1.5 shadow-[0_16px_40px_-16px_rgba(42,42,40,0.45)]";
const menuItem =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-antrasit hover:bg-cizgi/60 focus-visible:outline-2 focus-visible:outline-antrasit";

/** Phones: the view tools behind one button, so the scene and the fabrics come first. */
function MoreMenu(props: {
  kiosk: boolean;
  plan: boolean;
  onPlan: () => void;
  closeUp: boolean;
  onCloseUp: () => void;
  dimensions: boolean;
  onDimensions: () => void;
  comparing: boolean;
  onCompare: () => void;
}) {
  const { open, setOpen, root } = useMenu();
  const items: [string, boolean, () => void, React.ReactNode, boolean][] = [
    [
      "Plan görünümü",
      props.plan,
      props.onPlan,
      <IconPlan key="p" width={18} height={18} />,
      !props.kiosk,
    ],
    [
      "Yakından bak",
      props.closeUp,
      props.onCloseUp,
      <IconZoom key="z" width={18} height={18} />,
      !props.plan,
    ],
    [
      "Ölçüler",
      props.dimensions,
      props.onDimensions,
      <IconRuler key="r" width={18} height={18} />,
      !props.plan,
    ],
    [
      "Karşılaştır",
      props.comparing,
      props.onCompare,
      <IconCompare key="c" width={18} height={18} />,
      true,
    ],
  ];
  const active = items.some(([, on, , , shown]) => on && shown);
  return (
    <div ref={root} className="relative md:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-2 rounded-full px-4 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${
          active ? "bg-cizgi text-antrasit" : "text-antrasit hover:bg-cizgi/70"
        }`}
      >
        <span
          aria-hidden="true"
          className="text-[17px] leading-none tracking-[0.1em]"
        >
          ···
        </span>
        Daha fazla
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Görünüm araçları"
          className={`${menuPanel} left-0`}
        >
          {items
            .filter(([, , , , shown]) => shown)
            .map(([label, on, act, icon]) => (
              <button
                key={label}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => {
                  act();
                  setOpen(false);
                }}
                className={menuItem}
              >
                {icon}
                <span className="flex-1">{label}</span>
                <span
                  aria-hidden="true"
                  className={on ? "text-antrasit" : "text-transparent"}
                >
                  ✓
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function AddMenu({
  models,
  onAdd,
}: {
  models: FurnitureModel[];
  onAdd: (slug: string) => void;
}) {
  const { open, setOpen, root } = useMenu();
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mobilya ekle"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full bg-antrasit px-4 text-[13px] text-kagit transition-colors hover:bg-ceviz focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit"
      >
        <span aria-hidden="true" className="text-[17px] leading-none">
          +
        </span>
        <span className="max-md:hidden">Mobilya ekle</span>
        <span className="md:hidden">Ekle</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Eklenecek mobilya"
          className={`${menuPanel} right-0 md:left-0 md:right-auto`}
        >
          {models.map((m) => (
            <button
              key={m.slug}
              type="button"
              role="menuitem"
              onClick={() => {
                onAdd(m.slug);
                setOpen(false);
              }}
              className="flex w-full items-baseline justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-[14px] text-antrasit hover:bg-cizgi/60 focus-visible:outline-2 focus-visible:outline-antrasit"
            >
              <span>{m.name}</span>
              <span className="text-[12px] tabular-nums text-antrasit-50">
                {m.dimensionsCm.w}×{m.dimensionsCm.d} cm
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SceneTools({
  models,
  onAdd,
  plan,
  onPlan,
  closeUp,
  onCloseUp,
  dimensions,
  onDimensions,
  comparing,
  onCompare,
  kiosk = false,
}: {
  /** Showroom screen: visitors only try fabrics; no adding pieces, no plan (acil toplantı, 6 Oct). */
  kiosk?: boolean;
  models: FurnitureModel[];
  onAdd: (slug: string) => void;
  plan: boolean;
  onPlan: () => void;
  closeUp: boolean;
  onCloseUp: () => void;
  dimensions: boolean;
  onDimensions: () => void;
  comparing: boolean;
  onCompare: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Sahne araçları"
      className="flex items-center gap-0.5 rounded-full border border-cizgi bg-kagit/90 p-1 shadow-[0_6px_24px_-12px_rgba(42,42,40,0.35)] backdrop-blur-[2px]"
    >
      <MoreMenu
        kiosk={kiosk}
        plan={plan}
        onPlan={onPlan}
        closeUp={closeUp}
        onCloseUp={onCloseUp}
        dimensions={dimensions}
        onDimensions={onDimensions}
        comparing={comparing}
        onCompare={onCompare}
      />
      <div className="hidden items-center gap-0.5 md:flex">
        {!kiosk && (
          <div
            role="group"
            aria-label="Görünüm"
            className="mr-1 flex rounded-full bg-cizgi/60 p-0.5"
          >
            {(
              [
                [false, "3B", <IconCube key="c" width={17} height={17} />],
                [true, "Plan", <IconPlan key="p" width={17} height={17} />],
              ] as const
            ).map(([isPlan, label, icon]) => (
              <button
                key={label}
                type="button"
                aria-pressed={plan === isPlan}
                onClick={() => plan !== isPlan && onPlan()}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-antrasit ${
                  plan === isPlan
                    ? "bg-kagit text-antrasit shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                    : "text-antrasit-70 hover:text-antrasit"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}
        {!plan && (
          <ToolButton
            pressed={closeUp}
            onClick={onCloseUp}
            icon={
              closeUp ? (
                <IconZoomOut width={18} height={18} />
              ) : (
                <IconZoom width={18} height={18} />
              )
            }
            label={closeUp ? "Uzaklaş" : "Yakından bak"}
          />
        )}
        {!plan && (
          <ToolButton
            pressed={dimensions}
            onClick={onDimensions}
            icon={<IconRuler width={18} height={18} />}
            label="Ölçüler"
          />
        )}
        <ToolButton
          pressed={comparing}
          onClick={onCompare}
          icon={<IconCompare width={18} height={18} />}
          label="Karşılaştır"
        />
      </div>
      {!kiosk && (
        <>
          <span className="mx-1 h-6 w-px bg-cizgi" aria-hidden="true" />
          <AddMenu models={models} onAdd={onAdd} />
        </>
      )}
    </div>
  );
}

/** Vertical divider over the scene; drag (or use arrow keys) to move the split. */
export function CompareDivider({
  split,
  onSplit,
  leftCode,
  rightCode,
}: {
  split: number;
  onSplit: (v: number) => void;
  leftCode: string;
  rightCode: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromEvent = (e: RPointerEvent) => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    onSplit(Math.min(0.9, Math.max(0.1, (e.clientX - r.left) / r.width)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") onSplit(Math.max(0.1, split - 0.05));
    if (e.key === "ArrowRight") onSplit(Math.min(0.9, split + 0.05));
  };

  return (
    <div ref={host} className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-y-0 w-px bg-kagit shadow-[0_0_0_0.5px_rgba(42,42,40,0.25)]"
        style={{ left: `${split * 100}%` }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Karşılaştırma çizgisi"
        aria-valuemin={10}
        aria-valuemax={90}
        aria-valuenow={Math.round(split * 100)}
        aria-valuetext={`Solda ${leftCode}, sağda ${rightCode}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => dragging.current && fromEvent(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border border-cizgi bg-kagit text-antrasit shadow-[0_4px_16px_-6px_rgba(42,42,40,0.4)] focus-visible:outline-2 focus-visible:outline-antrasit"
        style={{ left: `${split * 100}%` }}
      >
        <IconArrowsH width={18} height={18} />
      </button>
      <span
        className="absolute top-24 -translate-x-[calc(100%+10px)] rounded-full bg-kagit/95 px-3 py-1 font-display text-[15px] tracking-[0.02em] text-antrasit md:top-28"
        style={{ left: `${split * 100}%` }}
        translate="no"
      >
        {leftCode}
      </span>
      <span
        className="absolute top-24 translate-x-[10px] rounded-full bg-kagit/95 px-3 py-1 font-display text-[15px] tracking-[0.02em] text-antrasit md:top-28"
        style={{ left: `${split * 100}%` }}
        translate="no"
      >
        {rightCode}
      </span>
    </div>
  );
}
