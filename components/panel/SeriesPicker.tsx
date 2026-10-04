"use client";

// Choose which fabric series are offered. None ticked = all series.

export function SeriesPicker({ all, value, onChange, label, emptyHint }: { all: string[]; value: string[]; onChange: (v: string[]) => void; label: string; emptyHint: string }) {
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] text-antrasit-70">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {all.map((s) => {
          const on = value.includes(s);
          return (
            <label
              key={s}
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] tracking-wide transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-antrasit ${
                on ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white text-antrasit hover:border-cizgi-koyu"
              }`}
            >
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s)} />
              {s}
            </label>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12px] text-antrasit-50">{value.length ? `${value.length} seri seçili.` : emptyHint}</p>
    </fieldset>
  );
}
