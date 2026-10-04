"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "./icons";

/**
 * Modal built on the native <dialog>: focus trapping, Esc to close and the
 * backdrop come from the browser, no extra dependency.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-cizgi bg-kagit p-0 text-antrasit shadow-[0_24px_60px_-20px_rgba(42,42,40,0.5)] backdrop:bg-antrasit/30 backdrop:backdrop-blur-[1px]`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-cizgi px-6 py-4">
        <h2 className="font-display text-xl">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-antrasit-70 hover:bg-cizgi/60 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit"
        >
          <IconClose width={18} height={18} />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}
