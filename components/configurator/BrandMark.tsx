import type { Firm } from "@/lib/types";

/** ORMEN wordmark (placeholder until the real logo file arrives), or the firm's logo on firm pages. */
export function BrandMark({ firm }: { firm?: Firm | null }) {
  if (firm) {
    return firm.logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={firm.logoUrl} alt={firm.name} className="h-9 w-auto max-w-[180px] object-contain object-left md:h-11" />
    ) : (
      <span className="font-display text-xl text-antrasit">{firm.name}</span>
    );
  }
  return (
    <span className="flex flex-col leading-none" aria-label="ORMEN Atelier">
      <span className="font-display text-[1.375rem] font-medium tracking-[0.28em] text-ceviz md:text-2xl">ORMEN</span>
      <span className="mt-1 text-[10px] tracking-[0.42em] text-antrasit-50 uppercase">Atelier</span>
    </span>
  );
}
