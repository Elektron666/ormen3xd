"use client";

import type { FurnitureModel } from "@/lib/types";
import { Dialog } from "@/components/ui/Dialog";

/** "Model değiştir": the same list as "Mobilya ekle", but the chosen model takes the piece's place. */
export function ModelSwapDialog({
  open,
  onClose,
  models,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  models: FurnitureModel[];
  current: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Model değiştir">
      <p className="mb-3 text-[13px] text-antrasit-70">Kumaş ve bölge seçimleriniz yeni modelde de kalır.</p>
      <ul className="flex flex-col">
        {models.map((m) => (
          <li key={m.slug}>
            <button
              type="button"
              onClick={() => onPick(m.slug)}
              aria-current={m.slug === current ? "true" : undefined}
              className={`flex w-full items-baseline justify-between gap-4 rounded-xl px-3 py-3 text-left text-[15px] hover:bg-cizgi/60 focus-visible:outline-2 focus-visible:outline-antrasit ${m.slug === current ? "bg-cizgi/50 font-medium" : ""}`}
            >
              <span>
                {m.name}
                {m.slug === current && <span className="ml-2 text-[12px] font-normal text-antrasit-50">şu an</span>}
              </span>
              <span className="text-[12px] tabular-nums text-antrasit-50">
                {m.dimensionsCm.w}×{m.dimensionsCm.d} cm
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
