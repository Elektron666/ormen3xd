"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/panel/kumaslar", "Kumaşlar"],
  ["/panel/modeller", "Modeller"],
  ["/panel/talepler", "Talepler"],
] as const;

export function PanelNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="flex gap-1">
      {LINKS.map(([href, label]) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${active ? "bg-antrasit text-kagit" : "text-antrasit-70 hover:bg-cizgi/60 hover:text-antrasit"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
