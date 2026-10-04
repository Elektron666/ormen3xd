"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Firm } from "@/lib/types";
import { idleState, KIOSK_WARNING } from "@/lib/kiosk";
import { BrandMark } from "@/components/configurator/BrandMark";
import { accentStyle } from "@/lib/firm";

// Showroom kiosk around the configurator:
// - a welcome screen until someone touches it (first touch also goes full screen)
// - after the idle time a 10 s "Hâlâ burada mısınız?" warning, then a full
//   reset for the next visitor: page reloaded to its starting link, the
//   session (favourites, visit id) wiped, so nothing of the previous person stays.

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

export function KioskShell({ idleSeconds, firm, children }: { idleSeconds: number; firm: Firm | null; children: ReactNode }) {
  const [welcome, setWelcome] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const last = useRef(0);
  const startHref = useRef<string | null>(null);
  // while the welcome screen is up there is nothing to reset
  const onWelcome = useRef(true);

  const reset = useCallback(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* storage blocked */
    }
    window.location.replace(startHref.current ?? window.location.href);
  }, []);

  useEffect(() => {
    startHref.current = window.location.href;
    last.current = Date.now();
    const bump = () => {
      last.current = Date.now();
    };
    for (const e of ACTIVITY) window.addEventListener(e, bump, { capture: true, passive: true });
    const noMenu = (e: Event) => e.preventDefault();
    window.addEventListener("contextmenu", noMenu);
    const tick = window.setInterval(() => {
      if (onWelcome.current) {
        last.current = Date.now();
        return;
      }
      const s = idleState(Date.now() - last.current, idleSeconds);
      if (s.reset) reset();
      else setRemaining(s.warn ? s.remaining : null);
    }, 500);
    return () => {
      for (const e of ACTIVITY) window.removeEventListener(e, bump, { capture: true });
      window.removeEventListener("contextmenu", noMenu);
      window.clearInterval(tick);
    };
  }, [idleSeconds, reset]);

  const start = () => {
    setWelcome(false);
    onWelcome.current = false;
    last.current = Date.now();
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="select-none [touch-action:manipulation]" style={accentStyle(firm) as React.CSSProperties | undefined} data-kiosk>
      {children}

      {welcome && (
        <button
          type="button"
          onClick={start}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-end gap-6 bg-gradient-to-t from-kagit from-15% via-kagit/70 via-40% to-transparent to-70% pb-[12vh] text-center focus-visible:outline-none"
          aria-label="Başlamak için dokunun"
        >
          <span className="rounded-2xl bg-kagit/90 px-5 py-3">
            <BrandMark firm={firm} />
          </span>
          <span className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-antrasit">Kumaşı koltuğun üstünde görün</span>
          <span className="text-[clamp(1rem,1.6vw,1.375rem)] text-antrasit-70">Dokunun, ORMEN kumaşlarını tek tek deneyin.</span>
          <span className="mt-2 animate-pulse rounded-full bg-accent px-8 py-4 text-[clamp(1rem,1.6vw,1.25rem)] text-accent-ink">Başlamak için dokunun</span>
        </button>
      )}

      {!welcome && remaining !== null && (
        <div role="alertdialog" aria-labelledby="kiosk-uyari" className="fixed inset-0 z-50 flex items-center justify-center bg-antrasit/30 p-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl bg-kagit p-8 text-center shadow-2xl">
            <p id="kiosk-uyari" className="font-display text-[28px]">
              Hâlâ burada mısınız?
            </p>
            <p className="mt-2 text-[16px] text-antrasit-70">
              {remaining} saniye sonra ekran bir sonraki ziyaretçi için baştan başlayacak; seçimleriniz silinecek.
            </p>
            <div className="mx-auto mt-5 h-1.5 w-full overflow-hidden rounded-full bg-cizgi">
              <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(remaining / KIOSK_WARNING) * 100}%` }} />
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => setRemaining(null)} className="h-12 rounded-full bg-antrasit px-6 text-[16px] text-kagit">
                Devam et
              </button>
              <button type="button" onClick={reset} className="h-12 rounded-full border border-cizgi px-6 text-[16px]">
                Baştan başla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
