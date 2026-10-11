"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/panel/kumaslar", "Kumaşlar"],
  ["/panel/modeller", "Modeller"],
  ["/panel/firmalar", "Firmalar"],
  ["/panel/talepler", "Talepler"],
  ["/panel/rapor", "Rapor"],
  ["/panel/geri-bildirim", "Geri bildirim"],
  ["/panel/durum", "Kurulum"],
  ["/panel/guvenlik", "Güvenlik"],
] as const;

export function PanelNav() {
  const path = usePathname();
  return (
    // on a phone the links scroll sideways instead of squeezing on top of each other
    <nav aria-label="Panel" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:order-none md:w-auto">
      {LINKS.map(([href, label]) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] transition-colors ${active ? "bg-antrasit text-kagit" : "text-antrasit-70 hover:bg-cizgi/60 hover:text-antrasit"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
