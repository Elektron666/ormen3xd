// Field measurement for the real-device test before the pilot (acil toplantı,
// 6 Oct, item 5). Opening any page with ?olcum shows a small panel with what
// the test sheet asks for: the quality tier the device got, whether the pixel
// ratio stepped down, how fast frames were while the scene moved, how long the
// first fabric took and what AR did. Nothing leaves the device; the tester
// copies the text and pastes it into the test table.

import type { Tier } from "@/lib/three/quality";

export interface Measurement {
  tier: Tier | null;
  textureSize: string | null;
  startDpr: number | null;
  dpr: number | null;
  /** Times the pixel ratio stepped down. */
  lowered: number;
  /** Milliseconds from page start to the first fabric on the sofa. */
  firstFabricMs: number | null;
  /** Recent intervals of frames that followed each other closely (seconds). */
  frames: number[];
  ar: "bilinmiyor" | "destekleniyor" | "desteklenmiyor" | "acildi" | "acilamadi";
}

const empty = (): Measurement => ({
  tier: null,
  textureSize: null,
  startDpr: null,
  dpr: null,
  lowered: 0,
  firstFabricMs: null,
  frames: [],
  ar: "bilinmiyor",
});

let state = empty();
const listeners = new Set<() => void>();
const KEEP = 240;

export function record(patch: Partial<Measurement>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Frame intervals arrive every frame; keep the last few and notify at most twice a second. */
let lastNotify = 0;
export function recordFrame(delta: number, now = Date.now()) {
  if (!(delta > 0 && delta < 0.2)) return;
  const frames = state.frames.length >= KEEP ? state.frames.slice(1) : state.frames.slice();
  frames.push(delta);
  state = { ...state, frames };
  if (now - lastNotify > 500) {
    lastNotify = now;
    listeners.forEach((l) => l());
  }
}

export function subscribe(on: () => void) {
  listeners.add(on);
  return () => listeners.delete(on);
}
export const snapshot = () => state;
export const reset = () => (state = empty());

/** "Android 14; SM-A546B · SamsungBrowser 25.0" out of a full user agent string. */
export function shortAgent(ua: string): string {
  const device = ua.match(/\(([^)]*)\)/)?.[1].replace(/^Linux; /, "").replace(/; K$/, "") ?? "";
  const browser = ua.match(/(SamsungBrowser|CriOS|FxiOS|EdgA|Edg|Firefox|Chrome)\/(\d+(?:\.\d+)?)/);
  const safari = /Safari/.test(ua) && ua.match(/Version\/(\d+(?:\.\d+)?)/);
  const name = browser ? `${browser[1]} ${browser[2]}` : safari ? `Safari ${safari[1]}` : "";
  return [device, name].filter(Boolean).join(" · ").slice(0, 90) || "bilinmiyor";
}

/** Median frames per second of the moving parts; null below 30 frames. */
export function medianFps(frames: number[]): number | null {
  if (frames.length < 30) return null;
  const s = [...frames].sort((a, b) => a - b);
  return Math.round(1 / s[Math.floor(s.length / 2)]);
}

const AR_TEXT: Record<Measurement["ar"], string> = {
  bilinmiyor: "denenmedi",
  destekleniyor: "destekleniyor (henüz açılmadı)",
  desteklenmiyor: "bu cihazda desteklenmiyor",
  acildi: "açıldı",
  acilamadi: "AÇILAMADI",
};

/** The lines shown on the panel and copied into the test table. */
export function summary(m: Measurement, device: { ua: string; cores?: number; memoryGb?: number; screen: string }): string[] {
  const fps = medianFps(m.frames);
  return [
    `Cihaz: ${device.ua}`,
    `Ekran: ${device.screen} · çekirdek ${device.cores ?? "?"} · bellek ${device.memoryGb !== undefined ? `${device.memoryGb} GB` : "?"}`,
    `Kalite: ${m.tier ?? "?"} · doku ${m.textureSize ?? "?"}`,
    `Piksel oranı: ${m.startDpr ?? "?"} → ${m.dpr ?? "?"}${m.lowered ? ` (${m.lowered} kez düştü)` : " (düşmedi)"}`,
    `Hareket hâlinde kare hızı: ${fps === null ? "ölçülmedi (sahneyi döndürün)" : `${fps} fps`}`,
    `İlk kumaş: ${m.firstFabricMs === null ? "gelmedi" : `${(m.firstFabricMs / 1000).toFixed(1).replace(".", ",")} sn`}`,
    `AR: ${AR_TEXT[m.ar]}`,
  ];
}
