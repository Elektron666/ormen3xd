"use client";

import { useState, useTransition } from "react";
import { hidePlaceholdersAction } from "@/app/panel/actions";
import { buttonClass } from "@/components/panel/ui";

/** "Take the sample catalogue off the site", asked twice; refused when a page would be left empty. */
export function HidePlaceholders({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = () =>
    start(async () => {
      const res = await hidePlaceholdersAction();
      setConfirming(false);
      setMessage(res.ok ? { ok: true, text: `${res.count} yer tutucu kumaş yayından kaldırıldı. Panelde duruyorlar; tek tek geri açılabilir.` } : { ok: false, text: res.error });
    });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-[14px]">{count} kumaş sitede görünmez olacak. Emin misiniz?</span>
          <button type="button" className={buttonClass.primary} disabled={pending} onClick={run}>
            Evet, yayından kaldır
          </button>
          <button type="button" className={buttonClass.quiet} disabled={pending} onClick={() => setConfirming(false)}>
            Vazgeç
          </button>
        </>
      ) : (
        <button type="button" className={buttonClass.secondary} onClick={() => (setMessage(null), setConfirming(true))}>
          Yer tutucuları yayından kaldır
        </button>
      )}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`w-full text-[14px] ${message.ok ? "text-[#35523a]" : "text-[#9a3b31]"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
