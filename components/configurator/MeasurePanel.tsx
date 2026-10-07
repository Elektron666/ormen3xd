"use client";

import { useState, useSyncExternalStore } from "react";
import { shortAgent, snapshot, subscribe, summary } from "@/lib/olcum";

const KEY = "ormen_olcum";
const noop = () => () => {};

/** On with ?olcum in the address; stays on for the tab, off with ?olcum=0. */
function measuring(): boolean {
  const q = new URLSearchParams(window.location.search);
  try {
    if (q.get("olcum") === "0") sessionStorage.removeItem(KEY);
    else if (q.has("olcum")) sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return q.has("olcum") && q.get("olcum") !== "0";
  }
}

/** Real-device test panel (acil toplantı, 6 Oct): nothing is sent anywhere. */
export function MeasurePanel() {
  // the address and storage exist only in the browser; false on the server
  const on = useSyncExternalStore(noop, measuring, () => false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);
  const m = useSyncExternalStore(subscribe, snapshot, snapshot);
  if (!on) return null;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lines = summary(m, {
    ua: shortAgent(nav.userAgent),
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    screen: `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}`,
  });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText([`ORMEN Atelier ölçüm · ${new Date().toLocaleString("tr-TR")}`, location.href, ...lines].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-label="Cihaz ölçümü"
      className="fixed bottom-2 left-2 z-50 max-w-[min(92vw,24rem)] rounded-lg bg-black/80 p-2.5 font-mono text-[10.5px] leading-snug text-white shadow-lg"
    >
      {open && (
        <ul className="mb-2">
          {lines.map((l) => (
            <li key={l.slice(0, 12)}>{l}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 font-sans text-xs font-medium">
        {open && (
          <button type="button" onClick={copy} className="rounded bg-white px-2 py-1 text-black">
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded border border-white/40 px-2 py-1">
          {open ? "Küçült" : "Ölçüm"}
        </button>
      </div>
    </section>
  );
}
