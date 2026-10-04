"use client";

import { useRef, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { IconArrowsH, IconCompare, IconRuler, IconZoom, IconZoomOut } from "@/components/ui/icons";

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

export function SceneTools({
  closeUp,
  onCloseUp,
  dimensions,
  onDimensions,
  comparing,
  onCompare,
}: {
  closeUp: boolean;
  onCloseUp: () => void;
  dimensions: boolean;
  onDimensions: () => void;
  comparing: boolean;
  onCompare: () => void;
}) {
  return (
    <div role="toolbar" aria-label="Sahne araçları" className="flex items-center gap-0.5 rounded-full border border-cizgi bg-kagit/90 p-1 shadow-[0_6px_24px_-12px_rgba(42,42,40,0.35)] backdrop-blur-[2px]">
      <ToolButton
        pressed={closeUp}
        onClick={onCloseUp}
        icon={closeUp ? <IconZoomOut width={18} height={18} /> : <IconZoom width={18} height={18} />}
        label={closeUp ? "Uzaklaş" : "Yakından bak"}
      />
      <ToolButton pressed={dimensions} onClick={onDimensions} icon={<IconRuler width={18} height={18} />} label="Ölçüler" />
      <ToolButton pressed={comparing} onClick={onCompare} icon={<IconCompare width={18} height={18} />} label="Karşılaştır" />
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
      <div className="absolute inset-y-0 w-px bg-kagit shadow-[0_0_0_0.5px_rgba(42,42,40,0.25)]" style={{ left: `${split * 100}%` }} />
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
