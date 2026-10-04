"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setFabricActiveAction, setFirmActiveAction, setModelActiveAction } from "@/app/panel/actions";

/** Switch for publishing / hiding a fabric, model or firm page. */
export function ActiveToggle({ id, active, label, kind = "fabric" }: { id: string; active: boolean; label: string; kind?: "fabric" | "model" | "firm" }) {
  const [shown, setShown] = useOptimistic(active);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-[12px] text-[#9a3b31]">
          {error}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={shown}
        aria-label={`${label} yayında`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setShown(!shown);
            setError(null);
            if (kind === "fabric") await setFabricActiveAction(id, !shown);
            else {
              const res = await (kind === "model" ? setModelActiveAction : setFirmActiveAction)(id, !shown);
              if (!res.ok) setError(res.error ?? "Değiştirilemedi.");
            }
          })
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${shown ? "bg-antrasit" : "bg-cizgi-koyu"}`}
      >
        <span
          className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${shown ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </span>
  );
}
