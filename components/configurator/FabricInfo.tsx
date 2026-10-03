"use client";

import { useState } from "react";
import type { Fabric } from "@/lib/types";
import { FABRIC_TYPE_LABELS, t } from "@/lib/i18n/tr";
import { IconCheck, IconCopy } from "@/components/ui/icons";

export function CopyCodeButton({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable (e.g. insecure context); the code stays selectable */
        }
      }}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs text-antrasit-70 transition-colors hover:bg-cizgi/60 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit ${className}`}
      aria-label={copied ? t.copied : `${code} kodunu kopyala`}
    >
      {copied ? <IconCheck width={18} height={18} /> : <IconCopy width={18} height={18} />}
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </button>
  );
}

/** Technical sheet of the selected fabric. Rows without data are omitted. */
export function FabricSpecs({ fabric }: { fabric: Fabric }) {
  const rows: [string, string | undefined][] = [
    [t.type, FABRIC_TYPE_LABELS[fabric.type]],
    [t.composition, fabric.composition],
    [t.martindale, fabric.martindale ? `${fabric.martindale.toLocaleString("tr-TR")} tur` : undefined],
    [t.width, fabric.widthCm ? `${fabric.widthCm} cm` : undefined],
    [t.weight, fabric.weightGsm ? `${fabric.weightGsm} g/m²` : undefined],
    [t.fireRating, fabric.fireRating],
  ];
  const visible = rows.filter((r): r is [string, string] => Boolean(r[1]));
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
      {visible.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-antrasit-50">{k}</dt>
          <dd className="text-antrasit">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FabricHeadline({ fabric, loading }: { fabric: Fabric; loading: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="eyebrow">Seçili kumaş</span>
        <span
          className={`h-1 w-1 rounded-full bg-accent transition-opacity duration-300 ${loading ? "animate-pulse opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        {loading && <span className="sr-only">{t.loadingFabric}</span>}
      </div>
      <p className="font-display text-[1.75rem] leading-[1.15] tracking-[0.01em] text-antrasit select-all" translate="no">
        {fabric.code}
      </p>
      <p className="mt-0.5 truncate text-sm text-antrasit-70">
        <span translate="no">{fabric.series}</span> · {fabric.colorName}
      </p>
    </div>
  );
}
