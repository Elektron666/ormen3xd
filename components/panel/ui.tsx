import type { ReactNode } from "react";

// Small, consistent building blocks for the panel forms.

export const inputClass =
  "h-11 w-full rounded-lg border border-cizgi bg-white px-3 text-[15px] text-antrasit placeholder:text-antrasit-50 focus:border-antrasit-50 focus:outline-none aria-[invalid=true]:border-[#b4483c]";

export const buttonClass = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-antrasit px-5 text-[14px] text-kagit transition-colors hover:bg-ceviz disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cizgi bg-white px-5 text-[14px] text-antrasit transition-colors hover:border-cizgi-koyu disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-antrasit",
  quiet:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] text-antrasit-70 transition-colors hover:bg-cizgi/60 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit",
};

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] text-antrasit-70">{label}</span>
      {children}
      {error ? <span className="text-[12px] text-[#9a3b31]">{error}</span> : hint ? <span className="text-[12px] text-antrasit-50">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({ title, children, eyebrow }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-cizgi pb-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "off" }) {
  const t = tone === "warn" ? "bg-[#F4E9DD] text-ceviz" : tone === "off" ? "bg-cizgi/70 text-antrasit-50" : "bg-cizgi/50 text-antrasit-70";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${t}`}>{children}</span>;
}
