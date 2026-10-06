"use client";

import { useActionState } from "react";
import { saveActualAction } from "./actions";

export function ActualForm({ id, rows }: { id: string; rows: { code: string; models: string; estimate: string }[] }) {
  const [state, action, pending] = useActionState(saveActualAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {rows.map((r, i) => (
        <label key={r.code} className="flex flex-col gap-1.5 rounded-2xl border border-cizgi bg-kagit p-4">
          <span className="font-medium tracking-wide" translate="no">
            {r.code}
          </span>
          <span className="text-[13px] text-antrasit-70">
            {r.models} · föyde: {r.estimate}
          </span>
          <span className="mt-1 text-[13px] text-antrasit-70">Kesilen gerçek metre</span>
          <input
            name={`m${i}`}
            inputMode="decimal"
            placeholder="ör. 12,5"
            className="h-12 rounded-lg border border-cizgi bg-white px-3 text-[17px] focus:border-antrasit-50 focus:outline-none"
          />
        </label>
      ))}
      {state?.error && (
        <p role="alert" className="text-[14px] text-[#9a3b31]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-12 rounded-full bg-antrasit text-[15px] text-kagit hover:bg-ceviz disabled:opacity-60">
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
