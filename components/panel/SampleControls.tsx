"use client";

import { useState, useTransition } from "react";
import { deleteSampleAction, updateSampleAction } from "@/app/panel/actions";
import { SAMPLE_STEPS, STEP_KEYS, type SampleStep } from "@/lib/samples";
// own sizes here: the shared input/button classes are full-height and full-width
const field = "h-9 rounded-lg border border-cizgi bg-white px-3 text-[14px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none";
const small =
  "inline-flex h-9 items-center justify-center rounded-full border border-cizgi bg-white px-4 text-[13px] text-antrasit transition-colors hover:border-cizgi-koyu disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-antrasit";

/** Step and lot of one sample request, and its label. */
export function SampleControls({ id, status, lot, code }: { id: string; status: SampleStep; lot?: string; code?: string }) {
  const [step, setStep] = useState(status);
  const [lotText, setLotText] = useState(lot ?? "");
  const [saved, setSaved] = useState(lot ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const save = (patch: { status?: SampleStep; lot?: string }) =>
    start(async () => {
      setError(null);
      const res = await updateSampleAction(id, patch);
      if (!res.ok) setError(res.error ?? "Kaydedilemedi.");
      else if (patch.lot !== undefined) setSaved(patch.lot.trim());
    });

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-cizgi pt-3">
      <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
        Adım
        <select
          value={step}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as SampleStep;
            setStep(next);
            save({ status: next });
          }}
          className={`${field} w-52`}
        >
          {STEP_KEYS.map((k) => (
            <option key={k} value={k}>
              {SAMPLE_STEPS[k]}
            </option>
          ))}
        </select>
      </label>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save({ lot: lotText });
        }}
      >
        <label className="flex flex-col gap-1 text-[12px] text-antrasit-70">
          Lot (topun parti no)
          <input value={lotText} onChange={(e) => setLotText(e.target.value)} maxLength={40} placeholder="boş bırakılırsa etikete elle yazılır" className={`${field} w-72`} />
        </label>
        {lotText.trim() !== saved && (
          <button type="submit" disabled={pending} className={small}>
            Kaydet
          </button>
        )}
      </form>
      {code && (
        <a href={`/panel/etiket/${id}`} target="_blank" rel="noopener" className={small}>
          Numune etiketi
        </a>
      )}
      <span className="ml-auto flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-[13px] text-antrasit-70">Ad ve telefonla birlikte kalıcı olarak silinsin mi?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteSampleAction(id);
                  if (!res.ok) setError(res.error ?? "Silinemedi.");
                })
              }
              className={`${small} border-[#b4483c] text-[#9a3b31]`}
            >
              Evet, sil
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={small}>
              Vazgeç
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={`${small} text-antrasit-70`}>
            Sil
          </button>
        )}
      </span>
      {error && (
        <p role="alert" className="text-[13px] text-[#9a3b31]">
          {error}
        </p>
      )}
    </div>
  );
}
