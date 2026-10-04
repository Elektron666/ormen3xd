"use client";

import { useOptimistic, useTransition } from "react";
import { setFabricActiveAction } from "@/app/panel/actions";

/** Switch for showing / hiding a fabric in the configurator. */
export function ActiveToggle({ id, active, label }: { id: string; active: boolean; label: string }) {
  const [shown, setShown] = useOptimistic(active);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-label={`${label} yayında`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setShown(!shown);
          await setFabricActiveAction(id, !shown);
        })
      }
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit ${shown ? "bg-antrasit" : "bg-cizgi-koyu"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${shown ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
